// Google Calendar connection — runs entirely in the visitor's browser.
//
//  * The only permission requested is calendar.freebusy ("see when you're busy").
//    No Gmail, no event titles, no email address, no openid/profile.
//  * The access token stays in this function's memory. It is never sent to our server,
//    never stored, and is revoked as soon as the one free/busy request finishes.
//  * Only the plan's own date range is asked for.
import { zonedToUtc, addDays } from './dates';

const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MOCK = import.meta.env.VITE_GOOGLE_MOCK === '1';
const SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export const googleAvailable = MOCK || !!CLIENT_ID;
export type BusyInterval = { start: number; end: number };

interface TokenResponse { access_token?: string; error?: string }
interface GoogleOAuth2 {
  initTokenClient(c: {
    client_id: string; scope: string; include_granted_scopes: boolean; prompt?: string;
    callback: (r: TokenResponse) => void; error_callback?: (e: { type?: string }) => void;
  }): { requestAccessToken(o?: { prompt?: string }): void };
  hasGrantedAllScopes(r: TokenResponse, ...scopes: string[]): boolean;
  revoke(token: string, done?: () => void): void;
}
declare global { interface Window { google?: { accounts?: { oauth2?: GoogleOAuth2 } } } }

let gis: Promise<GoogleOAuth2> | null = null;

/** Load Google's sign-in script ahead of the tap, so the permission popup isn't blocked. */
export function preloadGoogle(): Promise<GoogleOAuth2> | null {
  if (MOCK || !CLIENT_ID) return null;
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  gis ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error('gis')));
    s.onerror = () => { gis = null; reject(new Error('gis')); };
    document.head.appendChild(s);
  });
  return gis;
}

export class GoogleError extends Error {
  constructor(public kind: 'cancelled' | 'scope' | 'network' | 'unavailable') { super(kind); }
}

/** Ask Google once for busy times between the first and last day (inclusive) of the plan. */
export async function fetchBusy(firstDay: string, lastDay: string, tz: string): Promise<BusyInterval[]> {
  const timeMin = zonedToUtc(firstDay, 0, tz), timeMax = zonedToUtc(addDays(lastDay, 1), 0, tz);
  if (MOCK) return mockBusy(firstDay, lastDay, tz);
  const oauth = await (preloadGoogle() ?? Promise.reject(new GoogleError('unavailable'))).catch(() => { throw new GoogleError('unavailable'); });

  const token = await new Promise<string>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      include_granted_scopes: false,
      callback: r => {
        if (r.error || !r.access_token) return reject(new GoogleError('cancelled'));
        if (!oauth.hasGrantedAllScopes(r, SCOPE)) { oauth.revoke(r.access_token); return reject(new GoogleError('scope')); }
        resolve(r.access_token);
      },
      error_callback: () => reject(new GoogleError('cancelled')),
    });
    client.requestAccessToken();
  });

  try {
    const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ timeMin: new Date(timeMin).toISOString(), timeMax: new Date(timeMax).toISOString(), timeZone: tz, items: [{ id: 'primary' }] }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!r.ok) throw new GoogleError('network');
    const j = await r.json() as { calendars?: { primary?: { busy?: { start: string; end: string }[]; errors?: unknown[] } } };
    const cal = j.calendars?.primary;
    if (!cal || cal.errors?.length) throw new GoogleError('network');
    return (cal.busy || []).map(b => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  } finally {
    oauth.revoke(token);
  }
}

/* Local testing only (built with --mode mock): an office worker's week, no Google involved. */
async function mockBusy(firstDay: string, lastDay: string, tz: string): Promise<BusyInterval[]> {
  await new Promise(r => setTimeout(r, 700));
  const out: BusyInterval[] = [];
  for (let k = firstDay; k <= lastDay; k = addDays(k, 1)) {
    const d = new Date(`${k}T00:00:00`).getDay(), seed = Number(k.replace(/-/g, '')) % 7;
    if (d > 0 && d < 6) out.push({ start: zonedToUtc(k, 570, tz), end: zonedToUtc(k, 1110, tz) });
    if (seed === 3) out.push({ start: zonedToUtc(k, 1140, tz), end: zonedToUtc(k, 1290, tz) });
    if ((d === 0 || d === 6) && seed === 1) out.push({ start: zonedToUtc(k, 720, tz), end: zonedToUtc(k, 900, tz) });
  }
  return out;
}
