import { fromKey } from '../lib/dates';
import { slotsOf, type TimeSpec } from '../lib/scheduling';
import { T } from '../state';
import { ICON } from './dom';
import { dayCls } from './format';

const LABEL_W = 48, MIN_COL = 46;

/** Days across, half-hour rows down. `cellFn` returns each cell's markup.
 *  When the days don't fit, a strip above the grid shows which days are visible with ‹ › buttons,
 *  the columns are sized so the next day peeks in at the edge, and the hidden side fades out. */
export function timeGrid(spec: TimeSpec, tz: string, cellFn: (k: string, m: number, cls: string) => string, paint = false): string {
  const t = T(), days = [...spec.days].sort(), slots = slotsOf(spec.from, spec.to);
  let h = `<div class="tg-frame">
    <div class="tg-head" hidden><div><b class="tg-range"></b><span class="foot tg-count"></span></div>
      <div class="cal-nav"><button data-act="tgnav" data-v="-1" aria-label="${t.prevDays}">${ICON.calL}</button><button data-act="tgnav" data-v="1" aria-label="${t.nextDays}">${ICON.calR}</button></div></div>
    <div class="tg-clip"><div class="tg-wrap"><div class="tg${paint ? ' paint' : ''}" data-cols="${days.length}"><span class="corner"></span>`;
  h += days.map(k => `<span class="dh ${dayCls(k, tz)}" data-k="${k}"><small>${t.wd[fromKey(k).getDay()]}</small><b>${fromKey(k).getDate()}</b></span>`).join('');
  slots.forEach((m, si) => {
    const hour = (m - spec.from) % 60 === 0;
    h += `<span class="tl">${hour ? t.timeShort(m) : ''}</span>`;
    days.forEach((k, i) => { h += cellFn(k, m, `cell${hour ? '' : ' half'}${i === days.length - 1 ? ' last' : ''}${si === slots.length - 1 ? ' end' : ''}`); });
  });
  return h + '</div></div></div></div>';
}

interface GridInfo { colW: number; perPage: number; keys: string[] }
const info = new WeakMap<HTMLElement, GridInfo>();

/** Measure each grid after render: size columns for the peek, then keep the strip and fades in sync. */
export function bindTimeGrids() {
  document.querySelectorAll<HTMLElement>('.tg-frame').forEach(frame => {
    const wrap = frame.querySelector<HTMLElement>('.tg-wrap')!, grid = frame.querySelector<HTMLElement>('.tg')!;
    const keys = [...frame.querySelectorAll<HTMLElement>('.dh')].map(d => d.dataset.k!);
    const avail = wrap.clientWidth - LABEL_W;
    const fit = Math.floor(avail / MIN_COL);
    if (keys.length <= fit) { grid.style.removeProperty('--colw'); frame.querySelector<HTMLElement>('.tg-head')!.hidden = true; return; }
    // show some whole days plus ~40% of the next one, so it's clear the grid continues
    const perPage = Math.max(1, Math.floor(avail / MIN_COL - 0.4));
    const colW = Math.floor(avail / (perPage + 0.4));
    grid.style.setProperty('--colw', `${colW}px`);
    info.set(frame, { colW, perPage, keys });
    frame.querySelector<HTMLElement>('.tg-head')!.hidden = false;
    const sync = () => syncFrame(frame);
    wrap.addEventListener('scroll', sync, { passive: true });
    sync();
  });
}

function syncFrame(frame: HTMLElement) {
  const g = info.get(frame), wrap = frame.querySelector<HTMLElement>('.tg-wrap')!;
  if (!g) return;
  const t = T(), first = Math.min(g.keys.length - 1, Math.round(wrap.scrollLeft / g.colW));
  const last = Math.min(g.keys.length - 1, first + g.perPage - 1);
  const atStart = wrap.scrollLeft <= 2, atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2;
  frame.querySelector('.tg-range')!.textContent = t.range(t.dateShort(g.keys[first]), t.dateShort(g.keys[last]));
  frame.querySelector('.tg-count')!.textContent = t.daysOf(first + 1, last + 1, g.keys.length);
  frame.classList.toggle('more-l', !atStart);
  frame.classList.toggle('more-r', !atEnd);
  const [prev, next] = frame.querySelectorAll<HTMLButtonElement>('.tg-head .cal-nav button');
  prev.disabled = atStart; next.disabled = atEnd;
}

/** ‹ › : move by a page of whole days. */
export function pageTimeGrid(btn: HTMLElement, dir: number) {
  const frame = btn.closest<HTMLElement>('.tg-frame'), g = frame && info.get(frame);
  if (!frame || !g) return;
  const wrap = frame.querySelector<HTMLElement>('.tg-wrap')!;
  const first = Math.round(wrap.scrollLeft / g.colW);
  const target = Math.max(0, Math.min(g.keys.length - g.perPage, first + dir * g.perPage));
  wrap.scrollTo({ left: target * g.colW, behavior: 'smooth' });
}
