// Pure scheduling logic, ported from prototype/index.html. Everything here runs in the browser,
// on data that has already been decrypted.
import { addDays, eachDay, zonedParts, zonedToUtc } from './dates';

export type Block = { s: number; e: number; allDay?: boolean };
export type DayStatus = 'o' | 'm' | 'x';
export interface TripSpec { start: string; end: string; nights: number }
export interface TimeSpec { days: string[]; from: number; to: number }

export interface Member {
  id: string;
  name: string;
  src: 'google' | 'manual';
  hue: string;
  trip?: Record<string, DayStatus>;
  time?: Set<string>;
}

export const SLOT = 30;
export const MAX_NIGHTS = 14;

export function slotsOf(from: number, to: number): number[] {
  const a: number[] = [];
  for (let m = from; m < to; m += SLOT) a.push(m);
  return a;
}
export const slotFree = (bs: Block[], t: number) => !bs.some(b => b.s < t + SLOT && b.e > t);

/** Trip mode: turn one day's busy blocks into ○△×.
 *  All-day event, or 3+ hours busy between 10:00 and 20:00 → ×; any other plan → △; nothing → ○. */
export function dayStatus(bs: Block[]): DayStatus {
  if (bs.some(b => b.allDay)) return 'x';
  const core = bs.reduce((a, b) => a + Math.max(0, Math.min(b.e, 1200) - Math.max(b.s, 600)), 0);
  if (core >= 180) return 'x';
  return bs.length ? 'm' : 'o';
}

/** Split busy intervals (UTC ms, as Google returns them) into per-day blocks in the plan's time zone. */
export function busyByDay(intervals: { start: number; end: number }[], days: string[], tz: string): Record<string, Block[]> {
  const out: Record<string, Block[]> = {};
  for (const k of days) {
    const ds = zonedToUtc(k, 0, tz), de = zonedToUtc(addDays(k, 1), 0, tz);
    const blocks: Block[] = [];
    for (const iv of intervals) {
      if (iv.end <= ds || iv.start >= de) continue;
      const s = iv.start <= ds ? 0 : zonedParts(iv.start, tz).min;
      const e = iv.end >= de ? 1440 : zonedParts(iv.end, tz).min;
      blocks.push({ s, e, allDay: iv.start <= ds && iv.end >= de });
    }
    out[k] = blocks;
  }
  return out;
}

export const tripFromBusy = (spec: TripSpec, busy: Record<string, Block[]>) =>
  Object.fromEntries(eachDay(spec.start, spec.end).map(k => [k, dayStatus(busy[k] || [])])) as Record<string, DayStatus>;

export function timeFromBusy(spec: TimeSpec, busy: Record<string, Block[]>): Set<string> {
  const set = new Set<string>();
  for (const k of spec.days) for (const t of slotsOf(spec.from, spec.to)) if (slotFree(busy[k] || [], t)) set.add(`${k}|${t}`);
  return set;
}

/* ---- compact encodings for a response (what gets encrypted) ---- */
export const encodeTrip = (spec: TripSpec, m: Record<string, DayStatus>) =>
  eachDay(spec.start, spec.end).map(k => m[k] || 'x').join('');
export function decodeTrip(spec: TripSpec, s: string): Record<string, DayStatus> {
  const out: Record<string, DayStatus> = {};
  eachDay(spec.start, spec.end).forEach((k, i) => { const c = s[i]; out[k] = c === 'o' || c === 'm' ? c : 'x'; });
  return out;
}
export const encodeTime = (spec: TimeSpec, set: Set<string>) =>
  [...spec.days].sort().map(k => slotsOf(spec.from, spec.to).map(t => (set.has(`${k}|${t}`) ? '1' : '0')).join('')).join(',');
export function decodeTime(spec: TimeSpec, s: string): Set<string> {
  const set = new Set<string>(), rows = s.split(','), slots = slotsOf(spec.from, spec.to);
  [...spec.days].sort().forEach((k, i) => slots.forEach((t, j) => { if (rows[i]?.[j] === '1') set.add(`${k}|${t}`); }));
  return set;
}

/* ---- results ---- */
export interface TripWindow { s: string; e: string; per: { m: Member; w: DayStatus }[]; ok: number; mb: number }

/** Best non-overlapping stretches of `nights`+1 consecutive days, most people free first. */
export function tripWindows(spec: TripSpec, members: Member[], nights: number, limit = 4): TripWindow[] {
  const all: TripWindow[] = [];
  for (let s = spec.start; addDays(s, nights) <= spec.end; s = addDays(s, 1)) {
    const e = addDays(s, nights);
    const per = members.map(m => {
      let w: DayStatus = 'o';
      for (let k = s; k <= e; k = addDays(k, 1)) {
        const v = m.trip?.[k] || 'x';
        if (v === 'x') { w = 'x'; break; }
        if (v === 'm') w = 'm';
      }
      return { m, w };
    });
    all.push({ s, e, per, ok: per.filter(x => x.w === 'o').length, mb: per.filter(x => x.w === 'm').length });
  }
  all.sort((a, b) => b.ok - a.ok || b.mb - a.mb || (a.s < b.s ? -1 : 1));
  const pick: TripWindow[] = [];
  for (const w of all) {
    if (pick.length >= limit) break;
    if (pick.some(p => !(w.e < p.s || w.s > p.e))) continue;
    pick.push(w);
  }
  return pick;
}

export interface TimeWindow { k: string; s: number; e: number; who: Member[] }

/** No fixed duration: the longest stretches (at least an hour) where the most people overlap. */
export function timeBest(spec: TimeSpec, members: Member[], limit = 4): TimeWindow[] {
  const slots = slotsOf(spec.from, spec.to), minLen = Math.min(2, slots.length), cand: TimeWindow[] = [];
  const has = (m: Member, k: string, t: number) => !!m.time?.has(`${k}|${t}`);
  for (const k of spec.days) {
    for (let i = 0; i < slots.length; i++) {
      let who = members.filter(m => has(m, k, slots[i]));
      for (let j = i; j < slots.length && who.length; j++) {
        const nw = who.filter(m => has(m, k, slots[j]));
        if (nw.length < who.length) {
          if (j - i >= minLen) cand.push({ k, s: slots[i], e: slots[j], who });
          who = nw;
        }
        if (j === slots.length - 1 && who.length && j - i + 1 >= minLen) cand.push({ k, s: slots[i], e: Math.min(spec.to, slots[j] + SLOT), who });
      }
    }
  }
  cand.sort((a, b) => b.who.length - a.who.length || (b.e - b.s) - (a.e - a.s) || (a.k < b.k ? -1 : a.k > b.k ? 1 : a.s - b.s));
  const pick: TimeWindow[] = [];
  for (const c of cand) {
    if (pick.length >= limit) break;
    if (pick.some(p => p.k === c.k && c.s < p.e && c.e > p.s)) continue;
    pick.push(c);
  }
  return pick;
}
