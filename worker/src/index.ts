// Let's Meet server. It never talks to Google and never sees calendar data:
// it stores plan settings and encrypted boxes, and adds strict security headers to every response.
import { Poll } from './poll';
import { ID_RE, MAX_BOX, SECRET_RE, parseDecision, parseMeta } from './validate';

export { Poll };

interface Env {
  ASSETS: Fetcher;
  POLLS: DurableObjectNamespace<Poll>;
  WRITE_LIMITER?: RateLimit;
  POLL_TTL_SECONDS?: string;
}

const CSP = [
  "default-src 'none'",
  "script-src 'self' https://accounts.google.com/gsi/client",
  "style-src 'self' https://accounts.google.com/gsi/style",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://www.googleapis.com https://accounts.google.com/gsi/",
  'frame-src https://accounts.google.com/gsi/',
  "font-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

function withHeaders(res: Response, url: URL): Response {
  const r = new Response(res.body, res);
  const h = r.headers;
  h.set('Content-Security-Policy', CSP);
  h.set('Referrer-Policy', 'no-referrer');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); // Google's permission popup needs this
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
  if (url.protocol === 'https:') h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/e/')) {
    h.set('Cache-Control', 'no-store');
    h.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return r;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fail = (status: number) => json({ error: status }, status);

function b64u(bytes: Uint8Array) {
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function hashSecret(secret: string) {
  return b64u(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`letsmeet:${secret}`))));
}
const bearer = (req: Request) => {
  const s = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  return SECRET_RE.test(s) ? s : null;
};
async function readJson(req: Request, max: number): Promise<unknown> {
  const text = await req.text();
  if (text.length > max) throw new Error('too large');
  return JSON.parse(text);
}
const stubFor = (env: Env, id: string) => env.POLLS.get(env.POLLS.idFromName(id));
const todayUtc = () => new Date().toISOString().slice(0, 10);

async function limited(env: Env, req: Request) {
  if (!env.WRITE_LIMITER) return false;
  // the address is only used as an in-memory counter key at the edge; it is never stored
  const { success } = await env.WRITE_LIMITER.limit({ key: req.headers.get('cf-connecting-ip') || 'anon' });
  return !success;
}

async function api(req: Request, url: URL, env: Env): Promise<Response> {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','polls',id,...]
  if (parts[1] !== 'polls') return fail(404);
  const method = req.method;
  if (method !== 'GET' && req.headers.get('content-type')?.split(';')[0] !== 'application/json') return fail(415);
  if (method !== 'GET' && (await limited(env, req))) return fail(429);

  // POST /api/polls
  if (parts.length === 2 && method === 'POST') {
    const body = (await readJson(req, 8_000)) as { meta?: unknown; adminSecret?: unknown };
    const meta = parseMeta(body.meta, todayUtc());
    if (!meta || typeof body.adminSecret !== 'string' || !SECRET_RE.test(body.adminSecret)) return fail(400);
    const id = b64u(crypto.getRandomValues(new Uint8Array(16)));
    const ttl = Math.max(60, Number(env.POLL_TTL_SECONDS) || 604_800) * 1000;
    const r = await stubFor(env, id).create(meta, await hashSecret(body.adminSecret), ttl);
    return r.ok ? json({ id, expiresAt: r.value.expiresAt }, 201) : fail(r.status);
  }

  const id = parts[2];
  if (!id || !ID_RE.test(id)) return fail(404);
  const stub = stubFor(env, id);

  // GET /api/polls/:id
  if (parts.length === 3 && method === 'GET') {
    const data = await stub.read();
    return data ? json({ id, ...data }) : fail(404);
  }
  // DELETE /api/polls/:id
  if (parts.length === 3 && method === 'DELETE') {
    const secret = bearer(req);
    if (!secret) return fail(401);
    const r = await stub.destroy(await hashSecret(secret));
    return r.ok ? new Response(null, { status: 204 }) : fail(r.status);
  }
  // PUT /api/polls/:id/responses/:rid
  if (parts.length === 5 && parts[3] === 'responses' && method === 'PUT') {
    const rid = parts[4], secret = bearer(req);
    if (!ID_RE.test(rid)) return fail(404);
    if (!secret) return fail(401);
    const body = (await readJson(req, MAX_BOX + 200)) as { box?: unknown };
    if (typeof body.box !== 'string' || body.box.length > MAX_BOX || !/^[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/.test(body.box)) return fail(400);
    const r = await stub.putResponse(rid, body.box, await hashSecret(secret));
    return r.ok ? new Response(null, { status: 204 }) : fail(r.status);
  }
  // POST /api/polls/:id/decide
  if (parts.length === 4 && parts[3] === 'decide' && method === 'POST') {
    const secret = bearer(req);
    if (!secret) return fail(401);
    const current = await stub.metaForPreview();
    if (!current) return fail(404);
    const body = (await readJson(req, 2_000)) as { decision?: unknown };
    const decision = parseDecision(body.decision, current.meta);
    if (!decision) return fail(400);
    const r = await stub.decide(await hashSecret(secret), decision);
    return r.ok ? json({ expiresAt: r.value.expiresAt }) : fail(r.status);
  }
  return fail(405);
}

/** /e/:id — the app page, with the plan's title and cover filled in for LINE / iMessage link previews. */
async function planPage(req: Request, url: URL, env: Env, id: string): Promise<Response> {
  const page = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: req.headers }));
  const info = ID_RE.test(id) ? await stubFor(env, id).metaForPreview() : null;
  if (!info) return page;
  const title = info.meta.title || "Let's Meet";
  const image = `${url.origin}/og/${info.meta.cover}.png`;
  const set = (v: string) => ({ element(e: Element) { e.setAttribute('content', v); } });
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(`${title} · Let's Meet`); } })
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(info.decided ? 'The date is set.' : 'Add your availability.'))
    .on('meta[property="og:image"]', set(image))
    .transform(page);
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    let res: Response;
    try {
      const plan = url.pathname.match(/^\/e\/([^/]+)\/?$/);
      if (url.pathname.startsWith('/api/')) res = await api(req, url, env);
      else if (plan) res = await planPage(req, url, env, plan[1]);
      else {
        res = await env.ASSETS.fetch(req);
        // a missing script or stylesheet is a 404, never the app page served in its place
        if (url.pathname.startsWith('/assets/') && res.headers.get('content-type')?.startsWith('text/html')) res = new Response('Not found', { status: 404 });
      }
    } catch {
      res = fail(400);
    }
    return withHeaders(res, url);
  },
} satisfies ExportedHandler<Env>;
