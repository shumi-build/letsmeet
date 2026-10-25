import './styles.css';
import { S, onRender, render } from './state';
import { go, onRoute, navigate } from './nav';
import { $, closeSheet } from './ui/dom';
import { finishTimeSheet } from './ui/wheel';
import { closeMenu, menuOpen, scrolledAway } from './ui/menu';
import { afterCreate, createActions, fillCalendar, fitRange, flipMonth, pickCover, refreshCoverText, tapRange, togglePick, vCreate } from './screens/create';
import { afterEvent, eventActions, nextDayState, openPoll, setDay, updatePaintCount, vDecided, vRespond, vResults, vShare } from './screens/event';
import { vBadLink, vError, vLoading, vNotFound, vPrivacy } from './screens/misc';
import { afterHome, vHome } from './screens/home';
import { isPlanKey } from './lib/crypto';
import { store } from './lib/store';

/* ---------- render ---------- */
const VIEWS = {
  loading: vLoading, home: vHome, create: vCreate, share: vShare, respond: vRespond, results: vResults, decided: vDecided,
  notfound: vNotFound, badlink: vBadLink, error: vError, privacy: vPrivacy,
} as const;

onRender(() => {
  document.documentElement.lang = S.lang;
  const planTitle = S.view !== 'create' && S.view !== 'privacy' && S.poll ? S.poll.meta.title : '';
  document.title = planTitle ? `${planTitle} · Let's Meet` : "Let's Meet";
  $('#app')!.innerHTML = VIEWS[S.view]();
  if (S.view === 'create') afterCreate(); else if (S.view === 'home') afterHome(); else afterEvent();
});

/* ---------- routing ---------- */
function route() {
  closeSheet();
  const path = location.pathname, m = path.match(/^\/e\/([A-Za-z0-9_-]{16,32})\/?$/);
  if (m) {
    const key = location.hash.slice(1);
    void openPoll(m[1], isPlanKey(key) ? key : '', history.state?.view);
    return;
  }
  // "/" is the home page, "/new" the form for a new plan; anything unknown goes home
  S.view = path === '/privacy' ? 'privacy' : path === '/new' ? 'create' : 'home';
  if (!['/', '/new', '/privacy'].includes(path)) history.replaceState(null, '', '/');
  render();
  window.scrollTo(0, 0);
}
onRoute(route);
window.addEventListener('popstate', e => {
  const v = (e.state as { view?: typeof S.view } | null)?.view;
  // a screen change inside the same plan: no reload needed
  if (v && S.poll && location.pathname === `/e/${S.id}` && v !== 'loading') { closeSheet(); S.view = v; render(); return; }
  route();
});

/* ---------- clicks ---------- */
const actions: Record<string, (v: string, el: HTMLElement) => void> = {
  ...createActions,
  ...eventActions,
  go: v => go(v as typeof S.view),
  lang: v => { S.lang = v === 'ja' ? 'ja' : 'en'; store.setLang(S.lang); closeSheet(); render(); },
  closesheet: () => closeSheet(),
  timedone: () => finishTimeSheet(),
  retry: () => route(),
};

document.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  // an open menu takes the tap: run the chosen item, or just close it (like iOS)
  if (menuOpen()) {
    const item = target.closest<HTMLElement>('.menu [data-act]');
    closeMenu();
    if (item) actions[item.dataset.act!]?.(item.dataset.v || '', item);
    return;
  }
  const link = target.closest<HTMLAnchorElement>('a[data-link]');
  if (link) { e.preventDefault(); navigate(link.getAttribute('href')!); return; }
  // keyboard activation of calendar days (pointer input is handled by the drag code below)
  const kd = e.detail === 0 ? target.closest<HTMLElement>('[data-pick],[data-range],[data-day]') : null;
  if (kd) {
    if (kd.dataset.pick) togglePick(kd.dataset.pick);
    else if (kd.dataset.range) tapRange(kd.dataset.range);
    else setDay(kd, nextDayState(kd.dataset.day!));
    render(); return;
  }
  const cv = target.closest<HTMLElement>('[data-cv]');
  if (cv) { pickCover(Number(cv.dataset.cv)); return; }
  const el = target.closest<HTMLElement>('[data-act]');
  if (!el || el.hasAttribute('disabled')) return;
  actions[el.dataset.act!]?.(el.dataset.v || '', el);
});
$('#sheet')!.addEventListener('click', e => { if ((e.target as HTMLElement).id === 'sheet') closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeSheet(); } });
window.addEventListener('scroll', () => { if (menuOpen() && scrolledAway()) closeMenu(); }, { passive: true });

document.addEventListener('input', e => {
  const el = e.target as HTMLInputElement, k = el.dataset.input;
  if (k === 'title') { S.create.title[S.create.mode] = el.value; refreshCoverText(); }
  else if (k === 'name') S.myName = el.value;
});

let rz: number | undefined;
window.addEventListener('resize', () => { clearTimeout(rz); rz = window.setTimeout(() => { if (S.view === 'create') afterCreate(); else if (S.view === 'home') afterHome(); else afterEvent(); }, 150); });

/* ---------- drag across calendar days (create screen) ---------- */
type CalDrag = { type: 'pick'; on: boolean; last: string } | { type: 'range'; anchor: string; last: string; moved: boolean; pending: string | null };
let cdrag: CalDrag | null = null;

// Holding a drag past the calendar's edge (or past the last day) flips to the next/previous month.
let flipZone = 0, flipT: number | undefined;
function edgeZone(e: PointerEvent): number {
  const grid = document.querySelector('#create-cal .cal-grid');
  if (!grid) return 0;
  const r = grid.getBoundingClientRect();
  if (e.clientX > r.right - 2 || e.clientY > r.bottom + 2) return 1;
  if (e.clientX < r.left + 2) return -1;
  const edge = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-edge]');
  return edge ? (edge.dataset.edge === 'next' ? 1 : -1) : 0;
}
function setZone(z: number) {
  if (z === flipZone) return;
  flipZone = z;
  clearTimeout(flipT);
  if (z) flipT = window.setTimeout(doFlip, 450);
}
function doFlip() {
  if (!cdrag || !flipZone) return;
  if (flipMonth(flipZone)) navigator.vibrate?.(8);
  flipT = window.setTimeout(doFlip, 900); // keep going while the finger stays at the edge
}

document.addEventListener('pointerdown', e => {
  const c = (e.target as HTMLElement).closest<HTMLElement>('[data-pick],[data-range]');
  if (!c || e.button > 0) return;
  e.preventDefault();
  if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
  if (c.dataset.pick) {
    const on = togglePick(c.dataset.pick);
    c.classList.toggle('pick', on);
    cdrag = { type: 'pick', on, last: c.dataset.pick };
  } else {
    const k = c.dataset.range!, tr = S.create.trip, pending = S.create.rangePick;
    if (pending) { tr.start = k < pending ? k : pending; tr.end = k < pending ? pending : k; } else { tr.start = tr.end = k; }
    cdrag = { type: 'range', anchor: k, last: k, moved: false, pending };
    fillCalendar();
  }
});
window.addEventListener('pointermove', e => {
  if (!cdrag) return;
  setZone(edgeZone(e));
  const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(cdrag.type === 'pick' ? '[data-pick]' : '[data-range]');
  if (!hit) return;
  const k = hit.dataset.pick || hit.dataset.range!;
  if (k === cdrag.last) return;
  cdrag.last = k;
  if (cdrag.type === 'pick') { togglePick(k, cdrag.on); hit.classList.toggle('pick', cdrag.on); }
  else { const a = cdrag.anchor, tr = S.create.trip; cdrag.moved = true; tr.start = k < a ? k : a; tr.end = k < a ? a : k; fillCalendar(); }
});
const endCal = () => {
  setZone(0);
  if (!cdrag) return;
  if (cdrag.type === 'range') {
    S.create.rangePick = cdrag.moved || cdrag.pending ? null : cdrag.anchor;
    if (!S.create.rangePick) fitRange();
  }
  cdrag = null;
  render();
};
window.addEventListener('pointerup', endCal);
window.addEventListener('pointercancel', endCal);

/* ---------- swipe across days to change them (respond screen, trip) ----------
   A tap cycles one day. A sideways swipe paints the tapped day's next state across every day it
   passes. A vertical swipe is left to the browser, so the page still scrolls. */
let ddrag: { start: HTMLElement; x: number; state: ReturnType<typeof nextDayState> | null } | null = null;
document.addEventListener('pointerdown', e => {
  const c = (e.target as HTMLElement).closest<HTMLElement>('[data-day]');
  if (!c || e.button > 0) return;
  ddrag = { start: c, x: e.clientX, state: null };
});
window.addEventListener('pointermove', e => {
  if (!ddrag) return;
  if (!ddrag.state) {
    if (Math.abs(e.clientX - ddrag.x) < 8) return;
    ddrag.state = nextDayState(ddrag.start.dataset.day!);
    setDay(ddrag.start, ddrag.state);
    document.getElementById('avail')?.classList.add('painting');
  }
  const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-day]');
  if (hit) setDay(hit, ddrag.state);
});
window.addEventListener('pointerup', () => {
  if (!ddrag) return;
  if (!ddrag.state) setDay(ddrag.start, nextDayState(ddrag.start.dataset.day!));
  ddrag = null;
  render();
});
window.addEventListener('pointercancel', () => {
  if (!ddrag) return;
  const painted = !!ddrag.state;
  ddrag = null;
  if (painted) render(); // a scroll took over before anything changed: nothing to undo
});

/* ---------- paint free hours (respond screen) ---------- */
let painting: boolean | null = null;
function paintCell(c: HTMLElement) {
  const id = `${c.dataset.k}|${c.dataset.t}`;
  if (painting) S.draft.time.add(id); else S.draft.time.delete(id);
  c.classList.toggle('on', !!painting);
}
document.addEventListener('pointerdown', e => {
  const c = (e.target as HTMLElement).closest<HTMLElement>('.cell[data-paint]');
  if (!c || !S.paint) return;
  e.preventDefault();
  painting = !S.draft.time.has(`${c.dataset.k}|${c.dataset.t}`);
  paintCell(c);
  if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
});
window.addEventListener('pointermove', e => {
  if (painting === null) return;
  const c = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.cell[data-paint]');
  if (c) paintCell(c);
});
const endPaint = () => { if (painting !== null) { painting = null; updatePaintCount(); } };
window.addEventListener('pointerup', endPaint);
window.addEventListener('pointercancel', endPaint);

route();
