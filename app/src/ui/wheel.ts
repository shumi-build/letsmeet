// UIDatePicker-style wheels: start and end side by side, in 10-minute steps.
import { $, sheet, closeSheet } from './dom';
import { T } from '../state';
import { fmtT } from './format';

const WHEEL: number[] = [];
for (let m = 0; m <= 1440; m += 10) WHEEL.push(m);
const ITEM = 36;
const idx = (w: HTMLElement) => Math.max(0, Math.min(WHEEL.length - 1, Math.round(w.scrollTop / ITEM)));
const mark = (w: HTMLElement) => { const i = idx(w); [...w.children].forEach((c, j) => c.classList.toggle('on', j === i)); };

let pending: ((from: number, to: number) => void) | null = null;

export function openTimeSheet(from: number, to: number, onDone: (from: number, to: number) => void) {
  const t = T();
  pending = onDone;
  const col = (id: string) => `<div class="wheel" id="${id}">${WHEEL.map(m => `<div>${fmtT(m)}</div>`).join('')}</div>`;
  sheet(`<div class="sheet-top"><button class="tlink" data-act="closesheet">${t.cancel}</button><b class="headline">${t.timeH}</b><button class="tlink b" data-act="timedone">${t.done}</button></div>
    <div class="wheels-h foot"><span>${t.start}</span><span>${t.end}</span></div>
    <div class="wheels">${col('w-from')}${col('w-to')}</div>`);
  ([['w-from', from], ['w-to', to]] as const).forEach(([id, v]) => {
    const w = $(`#${id}`)!;
    w.scrollTop = WHEEL.indexOf(v) * ITEM;
    mark(w);
    let tm: number | undefined;
    w.addEventListener('scroll', () => { clearTimeout(tm); tm = window.setTimeout(() => mark(w), 40); }, { passive: true });
  });
}

export function finishTimeSheet() {
  let f = WHEEL[idx($('#w-from')!)], to = WHEEL[idx($('#w-to')!)];
  if (f >= 1440) f = 1430;
  if (to <= f) to = Math.min(1440, f + 60);
  closeSheet();
  pending?.(f, to);
  pending = null;
}
