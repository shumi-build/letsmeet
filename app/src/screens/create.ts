import { S, T, render, type Mode } from '../state';
import { $, esc, ICON, toast, applyDynamicStyles } from '../ui/dom';
import { shiftMonth } from '../ui/calendar';
import { COVERS, bindCarousel, centerCover, drawCover } from '../ui/covers';
import { ctaBar, coverOverlay, footer, langBtn, nightsVal, stepper } from '../ui/parts';
import { dayCls, fmtD, fmtR, fmtT, holShort } from '../ui/format';
import { openTimeSheet } from '../ui/wheel';
import { addDays, diffDays, pad, todayIn } from '../lib/dates';
import { MAX_NIGHTS } from '../lib/scheduling';
import { createPoll, type PollMeta } from '../lib/api';
import { newPlanKey, randomToken } from '../lib/crypto';
import { store } from '../lib/store';
import { navigate } from '../nav';

const C = () => S.create;
const MAX_RANGE_DAYS = 92;
const MAX_TIME_DAYS = 31;

function coverText(): { cap: string; sub: string } {
  const t = T(), c = C();
  if (c.mode === 'trip') return { cap: t.nights(c.trip.nights), sub: fmtR(t.dateShort(c.trip.start), t.dateShort(c.trip.end)) };
  const ds = [...c.time.days].sort();
  return {
    cap: fmtR(fmtT(c.time.from), fmtT(c.time.to)),
    sub: ds.length ? `${t.candDays(ds.length)} · ${fmtR(t.dateShort(ds[0]), t.dateShort(ds[ds.length - 1]))}` : t.candDays(0),
  };
}
const shownTitle = () => C().title[C().mode].trim() || T().untitled;

export function vCreate(): string {
  const t = T(), c = C(), trip = c.mode === 'trip';
  return `
  <header class="hdr"><div><div class="cap">Let's Meet</div><h1 class="large">${t.newPlan}</h1></div>${langBtn()}</header>
  <div class="sec">
    <div class="segc" role="group"><button class="${!trip ? 'on' : ''}" data-act="mode" data-v="time" aria-pressed="${!trip}">${t.kindTime}</button><button class="${trip ? 'on' : ''}" data-act="mode" data-v="trip" aria-pressed="${trip}">${t.kindTrip}</button></div>
    <p class="foot pi">${trip ? t.kindTripSub : t.kindTimeSub}</p>
  </div>
  <section class="sec"><h2 class="title3">${t.title}</h2>
    <div class="list"><label class="ri"><input type="text" id="ev-title" data-input="title" maxlength="80" value="${esc(c.title[c.mode])}" placeholder="${esc(t.titlePh)}" aria-label="${t.title}"></label></div></section>
  ${trip ? howLong() : timeSection()}
  ${coverPicker()}
  ${trip ? tripCalendar() : timeCalendar()}
  ${ctaBar('create', c.saving ? t.creating : t.ctaCreate, { busy: c.saving })}
  ${footer()}`;
}

function howLong() {
  const t = T(), n = C().trip.nights;
  return `<section class="sec"><h2 class="title3">${t.howLong}</h2>
    <div class="list"><div class="ri"><span class="k">${t.nightsRow}</span>${nightsVal(n)}${stepper('nightstep', n, 0, MAX_NIGHTS)}</div></div>
  </section>`;
}

function timeSection() {
  const t = T(), tm = C().time;
  return `<section class="sec"><h2 class="title3">${t.timeH}</h2>
    <div class="list"><div class="ri"><span class="k">${t.timeRow}</span>
      <button class="val" data-act="timesheet" aria-label="${t.start}">${fmtT(tm.from)}</button><span class="dash">–</span><button class="val" data-act="timesheet" aria-label="${t.end}">${fmtT(tm.to)}</button></div></div>
    <p class="foot pi">${t.timeNote}</p></section>`;
}

function coverPicker() {
  const t = T(), c = C(), sel = c.cover[c.mode], ct = coverText();
  return `<section class="sec"><h2 class="title3">${t.coverH}</h2>
    <div class="covers" id="covers">${COVERS.map((id, i) => `<button class="cv ${i === sel ? 'sel' : ''}" data-cv="${i}" aria-label="${t.coverNames[id]}" aria-pressed="${i === sel}"><canvas class="paint-cover" data-design="${id}" aria-hidden="true"></canvas><span class="brand-s">Let's Meet</span>${coverOverlay(ct.cap, shownTitle(), ct.sub)}</button>`).join('')}</div>
    <div class="cv-meta"><span class="foot strong" id="cv-name">${t.coverNames[COVERS[sel]]}</span><div class="dots" id="cv-dots">${COVERS.map((_, i) => `<i class="${i === sel ? 'on' : ''}"></i>`).join('')}</div></div>
    <p class="foot pi tc">${t.coverNote}</p></section>`;
}

export function rangeClasses(k: string) {
  const c = C(), tr = c.trip;
  let cls = 'd ' + dayCls(k, c.tz) + (k === todayIn(c.tz) ? ' today' : '');
  if (k >= tr.start && k <= tr.end) {
    if (k === tr.start) cls += ' rs';
    if (k === tr.end) cls += ' re';
    if (k !== tr.start && k !== tr.end) cls += ' inrange';
  }
  return cls;
}

function tripCalendar() {
  const t = T(), c = C(), tr = c.trip, len = diffDays(tr.start, tr.end) + 1, combos = Math.max(0, len - tr.nights);
  return `<section class="sec"><h2 class="title3">${t.periodQ}</h2>
    <p class="sub pi">${t.searchHint(esc(t.nights(tr.nights)))}</p>
    <div class="list pad">${calendarShell(c.cal.trip)}</div>
    <p class="foot pi">${c.rangePick ? t.tapEnd : t.tapRange} ${t.tripHint(t.nights(tr.nights), combos, len)}</p>
  </section>`;
}

function timeCalendar() {
  const t = T(), c = C();
  return `<section class="sec"><h2 class="title3">${t.daysQ}</h2>
    <div class="list pad">${calendarShell(c.cal.time)}</div>
    <p class="foot pi" id="days-note">${t.daysHint(c.time.days.length)}</p></section>`;
}

/* The create-screen calendar always has the same 42 day slots. Changing month only rewrites
   their contents, so a drag that runs past the edge can flip to the next month without
   removing the element under the finger (which would end the touch on iPhone). */
function calendarShell(ym: string) {
  const t = T(), [y, m] = ym.split('-').map(Number);
  const slots = Array.from({ length: 42 }, (_, i) => `<button class="d" data-slot="${i}"><span class="n"></span><span class="hn"></span></button>`).join('');
  return `<div class="cal" id="create-cal"><div class="cal-head"><b id="cal-title">${t.monthHead(y, m)}</b><div class="cal-nav"><button data-act="cal" data-v="-1" aria-label="${t.prevMonth}">${ICON.calL}</button><button data-act="cal" data-v="1" aria-label="${t.nextMonth}">${ICON.calR}</button></div></div>
    <div class="cal-grid">${t.wdMini.map(w => `<span class="wd">${w}</span>`).join('')}${slots}</div></div>`;
}

export function fillCalendar() {
  const cal = document.getElementById('create-cal');
  if (!cal) return;
  const c = C(), kind = c.mode, ym = c.cal[kind], [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay(), n = new Date(y, m, 0).getDate(), today = todayIn(c.tz);
  $('#cal-title')!.textContent = T().monthHead(y, m);
  cal.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b => {
    const d = Number(b.dataset.slot) - first + 1, num = b.firstElementChild!, hol = b.lastElementChild!;
    delete b.dataset.range; delete b.dataset.pick; delete b.dataset.edge;
    b.removeAttribute('aria-pressed'); b.removeAttribute('aria-hidden');
    if (d < 1 || d > n) {
      b.className = 'd blank'; b.disabled = true; b.setAttribute('aria-hidden', 'true');
      b.dataset.edge = d < 1 ? 'prev' : 'next';
      num.textContent = ''; hol.textContent = '';
      return;
    }
    const k = `${y}-${pad(m)}-${pad(d)}`;
    num.textContent = String(d);
    hol.textContent = kind === 'trip' ? holShort(k, c.tz) : '';
    b.setAttribute('aria-label', fmtD(k));
    if (k < today) { b.className = 'd off'; b.disabled = true; return; }
    b.disabled = false;
    if (kind === 'trip') { b.className = rangeClasses(k); b.dataset.range = k; return; }
    const on = c.time.days.includes(k);
    b.className = `d ${dayCls(k, c.tz)}${k === today ? ' today' : ''}${on ? ' pick' : ''}`;
    b.dataset.pick = k;
    b.setAttribute('aria-pressed', String(on));
  });
}

/** Move the create calendar by one month (never before the current month). Returns false if it can't. */
export function flipMonth(dir: number) {
  const c = C(), next = shiftMonth(c.cal[c.mode], dir);
  if (next < todayIn(c.tz).slice(0, 7)) return false;
  c.cal[c.mode] = next;
  fillCalendar();
  return true;
}

/* ---------- after render ---------- */
export function afterCreate() {
  fillCalendar();
  document.querySelectorAll<HTMLCanvasElement>('canvas.paint-cover').forEach(c => drawCover(c));
  bindCarousel(C().cover[C().mode], markCover);
  applyDynamicStyles();
}
function markCover(i: number) {
  const c = C();
  c.cover[c.mode] = i;
  document.querySelectorAll('#covers .cv').forEach((el, j) => { el.classList.toggle('sel', j === i); el.setAttribute('aria-pressed', String(j === i)); });
  document.querySelectorAll('#cv-dots i').forEach((d, j) => d.classList.toggle('on', j === i));
  const n = $('#cv-name');
  if (n) n.textContent = T().coverNames[COVERS[i]];
}
export function refreshCoverText() {
  const ct = coverText();
  document.querySelectorAll('[data-cv-title]').forEach(e => (e.textContent = shownTitle()));
  document.querySelectorAll('[data-cv-cap]').forEach(e => (e.textContent = ct.cap));
  document.querySelectorAll('[data-cv-sub]').forEach(e => (e.textContent = ct.sub));
}
export function pickCover(i: number) { markCover(i); centerCover(i, true); }

/* ---------- edits ---------- */
export function fitRange() {
  const tr = C().trip;
  if (diffDays(tr.start, tr.end) < tr.nights) tr.end = addDays(tr.start, tr.nights);
  if (diffDays(tr.start, tr.end) >= MAX_RANGE_DAYS) tr.end = addDays(tr.start, MAX_RANGE_DAYS - 1);
}
export function togglePick(k: string, force?: boolean) {
  const d = C().time.days, i = d.indexOf(k), on = force ?? i < 0;
  if (on && i < 0 && d.length < MAX_TIME_DAYS) d.push(k);
  if (!on && i >= 0) d.splice(i, 1);
  d.sort();
  return on;
}
export function tapRange(k: string) {
  const c = C(), tr = c.trip;
  if (!c.rangePick) { tr.start = tr.end = k; c.rangePick = k; }
  else { const a = c.rangePick; tr.start = k < a ? k : a; tr.end = k < a ? a : k; c.rangePick = null; fitRange(); }
}

export const createActions: Record<string, (v: string, el: HTMLElement) => void> = {
  mode(v) { const c = C(); if (c.mode !== v) { c.mode = v as Mode; c.rangePick = null; render(); } },
  nightstep(v) { const c = C(); c.trip.nights = Math.min(MAX_NIGHTS, Math.max(0, c.trip.nights + Number(v))); fitRange(); render(); },
  cal(v) { const c = C(); const [y, m] = c.cal[c.mode].split('-').map(Number); const d = new Date(y, m - 1 + Number(v), 1); c.cal[c.mode] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; render(); },
  timesheet() { const tm = C().time; openTimeSheet(tm.from, tm.to, (f, to) => { tm.from = f; tm.to = to; render(); }); },
  create() { void createPlan(); },
};

async function createPlan() {
  const c = C(), t = T();
  if (c.saving) return;
  if (c.mode === 'time' && !c.time.days.length) { toast(esc(t.needDays)); return; }
  const meta: PollMeta = {
    v: 1, mode: c.mode, title: c.title[c.mode].trim().slice(0, 80), cover: COVERS[c.cover[c.mode]], tz: c.tz,
    ...(c.mode === 'trip' ? { trip: { ...c.trip } } : { time: { days: [...c.time.days].sort(), from: c.time.from, to: c.time.to } }),
  };
  const key = newPlanKey(), admin = randomToken();
  c.saving = true; render();
  try {
    const { id } = await createPoll(meta, admin);
    store.setAdmin(id, admin);
    c.saving = false;
    navigate(`/e/${id}#${key}`, 'share');
  } catch {
    c.saving = false; render();
    toast(esc(t.createFailed));
  }
}
