// One Durable Object per plan: a small box with its own self-destruct timer.
// It holds only plan settings, encrypted responses it cannot read, and hashes of secrets.
import { DurableObject } from 'cloudflare:workers';
import { addDays, zonedToUtc } from '../../app/src/lib/dates';
import { MAX_RESPONSES, type Decision, type Meta } from './validate';

const DAY = 86_400_000;
const MAX_LIFETIME = 60 * DAY;

interface Head { meta: Meta; adminHash: string; createdAt: number; expiresAt: number; decided?: Decision }
interface Resp { box: string; hash: string }
export type Result<T> = { ok: true; value: T } | { ok: false; status: number };

const eq = (a: string, b: string) => {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
};

export class Poll extends DurableObject {
  private head() { return this.ctx.storage.get<Head>('head'); }

  async create(meta: Meta, adminHash: string, ttlMs: number): Promise<Result<{ expiresAt: number }>> {
    if (await this.head()) return { ok: false, status: 409 };
    const createdAt = Date.now(), expiresAt = createdAt + ttlMs;
    await this.ctx.storage.put<Head>('head', { meta, adminHash, createdAt, expiresAt });
    await this.ctx.storage.setAlarm(expiresAt);
    return { ok: true, value: { expiresAt } };
  }

  async read() {
    const h = await this.head();
    if (!h || h.expiresAt <= Date.now()) return null;
    const rs = await this.ctx.storage.list<Resp>({ prefix: 'r:' });
    return {
      meta: h.meta, createdAt: h.createdAt, expiresAt: h.expiresAt, decided: h.decided,
      responses: [...rs].map(([k, v]) => ({ rid: k.slice(2), box: v.box })),
    };
  }

  async putResponse(rid: string, box: string, hash: string): Promise<Result<null>> {
    const h = await this.head();
    if (!h || h.expiresAt <= Date.now()) return { ok: false, status: 404 };
    if (h.decided) return { ok: false, status: 409 };
    const prev = await this.ctx.storage.get<Resp>(`r:${rid}`);
    if (prev && !eq(prev.hash, hash)) return { ok: false, status: 403 };
    if (!prev && (await this.ctx.storage.list({ prefix: 'r:' })).size >= MAX_RESPONSES) return { ok: false, status: 429 };
    await this.ctx.storage.put<Resp>(`r:${rid}`, { box, hash });
    return { ok: true, value: null };
  }

  /** Picking a date deletes every response at once; only the title and date remain. */
  async decide(adminHash: string, decision: Decision): Promise<Result<{ expiresAt: number }>> {
    const h = await this.head();
    if (!h || h.expiresAt <= Date.now()) return { ok: false, status: 404 };
    if (!eq(h.adminHash, adminHash)) return { ok: false, status: 403 };
    const keys = [...(await this.ctx.storage.list({ prefix: 'r:' })).keys()];
    for (let i = 0; i < keys.length; i += 128) await this.ctx.storage.delete(keys.slice(i, i + 128));
    // gone at the end of the day after the event, never later than 60 days after creation
    const afterEvent = zonedToUtc(addDays(decision.end, 2), 0, h.meta.tz);
    const expiresAt = Math.max(Date.now() + 3_600_000, Math.min(afterEvent, h.createdAt + MAX_LIFETIME));
    await this.ctx.storage.put<Head>('head', { ...h, decided: decision, expiresAt });
    await this.ctx.storage.setAlarm(expiresAt);
    return { ok: true, value: { expiresAt } };
  }

  async destroy(adminHash: string): Promise<Result<null>> {
    const h = await this.head();
    if (!h) return { ok: false, status: 404 };
    if (!eq(h.adminHash, adminHash)) return { ok: false, status: 403 };
    await this.wipe();
    return { ok: true, value: null };
  }

  async metaForPreview() {
    const h = await this.head();
    return h && h.expiresAt > Date.now() ? { meta: h.meta, decided: h.decided } : null;
  }

  /** The self-destruct timer. */
  async alarm() { await this.wipe(); }

  private async wipe() {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }
}
