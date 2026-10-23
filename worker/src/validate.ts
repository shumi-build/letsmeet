// Strict checks on everything the browser sends. Anything unexpected is rejected.
import { addDays, diffDays, isDateKey } from '../../app/src/lib/dates';

export const COVERS = ['mountain', 'city', 'dinner', 'mahjong', 'ocean', 'snow', 'forest', 'gradient'];
export const ID_RE = /^[A-Za-z0-9_-]{22}$/;      // 128-bit random ids
export const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;  // 256-bit random secrets
export const MAX_BOX = 24_000;                   // one encrypted response
export const MAX_RESPONSES = 50;

export interface Meta {
  v: 1; mode: 'trip' | 'time'; title: string; cover: string; tz: string;
  trip?: { start: string; end: string; nights: number };
  time?: { days: string[]; from: number; to: number };
}
export interface Decision { start: string; end: string; startMin?: number; endMin?: number }

const isInt = (n: unknown, lo: number, hi: number): n is number => Number.isInteger(n) && (n as number) >= lo && (n as number) <= hi;
// control characters and angle brackets are never needed in a title
const cleanText = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim();

function validTz(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

export function parseMeta(x: unknown, todayUtc: string): Meta | null {
  if (!x || typeof x !== 'object') return null;
  const m = x as Record<string, unknown>;
  if (m.v !== 1 || (m.mode !== 'trip' && m.mode !== 'time')) return null;
  if (typeof m.title !== 'string' || m.title.length > 200) return null;
  if (typeof m.cover !== 'string' || !COVERS.includes(m.cover) || !validTz(m.tz)) return null;
  const minDay = addDays(todayUtc, -2), maxDay = addDays(todayUtc, 400);
  const out: Meta = { v: 1, mode: m.mode, title: cleanText(m.title).slice(0, 80), cover: m.cover, tz: m.tz };
  if (m.mode === 'trip') {
    const t = m.trip as Record<string, unknown> | undefined;
    if (!t || !isDateKey(t.start) || !isDateKey(t.end) || !isInt(t.nights, 0, 14)) return null;
    if (t.start > t.end || t.start < minDay || t.end > maxDay) return null;
    const span = diffDays(t.start, t.end);
    if (span > 91 || span < t.nights) return null;
    out.trip = { start: t.start, end: t.end, nights: t.nights };
  } else {
    const t = m.time as Record<string, unknown> | undefined;
    if (!t || !Array.isArray(t.days) || t.days.length < 1 || t.days.length > 31) return null;
    if (!t.days.every(d => isDateKey(d) && d >= minDay && d <= maxDay)) return null;
    const days = [...new Set(t.days as string[])].sort();
    if (!isInt(t.from, 0, 1430) || !isInt(t.to, 10, 1440) || t.from % 10 || t.to % 10 || t.from >= t.to) return null;
    out.time = { days, from: t.from, to: t.to };
  }
  return out;
}

export function parseDecision(x: unknown, meta: Meta): Decision | null {
  if (!x || typeof x !== 'object') return null;
  const d = x as Record<string, unknown>;
  if (!isDateKey(d.start) || !isDateKey(d.end) || d.start > d.end) return null;
  if (meta.mode === 'trip' && meta.trip) {
    if (d.start < meta.trip.start || d.end > meta.trip.end || d.startMin !== undefined) return null;
    return { start: d.start, end: d.end };
  }
  if (meta.time) {
    if (d.start !== d.end || !meta.time.days.includes(d.start)) return null;
    if (!isInt(d.startMin, meta.time.from, meta.time.to) || !isInt(d.endMin, meta.time.from, meta.time.to) || d.startMin >= d.endMin) return null;
    return { start: d.start, end: d.end, startMin: d.startMin, endMin: d.endMin };
  }
  return null;
}
