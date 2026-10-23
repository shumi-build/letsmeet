import { dow } from '../lib/dates';
import { holiday } from '../lib/holidays';
import { S, T } from '../state';

export const fmtD = (k: string) => T().date(k);
export const fmtT = (m: number) => T().time(m);
export const fmtR = (a: string, b: string) => T().range(a, b);
export const holidayName = (k: string, tz: string) => holiday(k, tz, S.lang);
export const holShort = (k: string, tz: string) => { const h = holidayName(k, tz); return h ? (T().holShort || h.slice(0, 4)) : ''; };
export const dayCls = (k: string, tz: string) => (holidayName(k, tz) ? 'hol' : dow(k) === 0 ? 'sun' : dow(k) === 6 ? 'sat' : '');
export const expiryDate = (ms: number) => {
  const d = new Date(ms);
  return S.lang === 'ja' ? `${d.getMonth() + 1}月${d.getDate()}日` : `${T().mon[d.getMonth()]} ${d.getDate()}`;
};
