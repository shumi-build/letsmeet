import { pad } from '../lib/dates';
import { ICON } from './dom';
import { T } from '../state';

export function month(ym: string, cellFn: (k: string, d: number) => string, nav: boolean): string {
  const t = T(), [y, m] = ym.split('-').map(Number), first = new Date(y, m - 1, 1).getDay(), n = new Date(y, m, 0).getDate();
  let h = `<div class="cal"><div class="cal-head"><b>${t.monthHead(y, m)}</b>${nav ? `<div class="cal-nav"><button data-act="cal" data-v="-1" aria-label="${t.prevMonth}">${ICON.calL}</button><button data-act="cal" data-v="1" aria-label="${t.nextMonth}">${ICON.calR}</button></div>` : ''}</div><div class="cal-grid">`;
  h += t.wdMini.map(w => `<span class="wd">${w}</span>`).join('');
  for (let i = 0; i < first; i++) h += '<span></span>';
  for (let d = 1; d <= n; d++) h += cellFn(`${y}-${pad(m)}-${pad(d)}`, d);
  return h + '</div></div>';
}

export function monthsBetween(a: string, b: string): string[] {
  const out: string[] = [];
  let [y, m] = a.slice(0, 7).split('-').map(Number);
  const end = b.slice(0, 7);
  for (;;) {
    const ym = `${y}-${pad(m)}`;
    out.push(ym);
    if (ym >= end) break;
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

export const shiftMonth = (ym: string, d: number) => {
  let [y, m] = ym.split('-').map(Number);
  m += d;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  return `${y}-${pad(m)}`;
};
