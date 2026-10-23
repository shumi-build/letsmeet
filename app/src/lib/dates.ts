// Calendar dates are plain "YYYY-MM-DD" keys; times of day are minutes since midnight (0–1440)
// in the plan's own time zone.

export const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const diffDays = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 864e5);
export const dow = (k: string) => fromKey(k).getDay();
export const isDateKey = (k: unknown): k is string => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

export function eachDay(a: string, b: string): string[] {
  const out: string[] = [];
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
  return out;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

/** Wall-clock date and minute of an instant in a time zone. */
export function zonedParts(ms: number, tz: string): { key: string; min: number } {
  const p: Record<string, string> = {};
  for (const x of partsFormatter(tz).formatToParts(new Date(ms))) p[x.type] = x.value;
  return { key: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

/** The instant (UTC ms) of a wall-clock date and minute in a time zone. */
export function zonedToUtc(key: string, min: number, tz: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const want = Date.UTC(y, m - 1, d, 0, min);
  let ms = want;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(ms, tz);
    const [py, pm, pd] = p.key.split('-').map(Number);
    const diff = want - Date.UTC(py, pm - 1, pd, 0, p.min);
    if (!diff) break;
    ms += diff;
  }
  return ms;
}

export const todayIn = (tz: string) => zonedParts(Date.now(), tz).key;
export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
