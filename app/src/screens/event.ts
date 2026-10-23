import { S, T, render, type View } from '../state';
import { $, av, closeSheet, esc, GCAL, hueFor, ICON, sheet, toast, applyDynamicStyles } from '../ui/dom';
import { month, monthsBetween } from '../ui/calendar';
import { drawCover, isCover } from '../ui/covers';
import { openMenu } from '../ui/menu';
import { bindTimeGrids, pageTimeGrid, timeGrid } from '../ui/timegrid';
import { ctaBar, coverOverlay, footer, langBtn, navBar, nightsVal, stepper } from '../ui/parts';
import { dayCls, expiryDate, fmtD, fmtR, fmtT, holidayName, holShort } from '../ui/format';
import { heatClass, heatLegend } from '../ui/heat';
import { diffDays, dow, eachDay } from '../lib/dates';
import {
  MAX_NIGHTS, busyByDay, dayStatus, decodeTime, decodeTrip, encodeTime, encodeTrip, slotFree, timeBest, timeFromBusy, tripFromBusy, tripWindows,
  type DayStatus, type Member,
} from '../lib/scheduling';
import { ApiError, decidePoll, deletePoll, getPoll, putResponse, type Decision, type PollData, type PollMeta } from '../lib/api';
import { decryptJson, encryptJson, randomToken } from '../lib/crypto';
import { fetchBusy, googleAvailable, GoogleError, preloadGoogle } from '../lib/google';
import { googleCalendarUrl, icsFile } from '../lib/calendarLink';
import { store } from '../lib/store';
import { go, navigate } from '../nav';

/** What is inside each encrypted response box. */
interface Box { n: string; s: 'google' | 'manual'; d: string }

const meta = () => S.poll!.meta;
const ctx = (rid: string) => `${S.id}:${rid}`;
const shareUrl = () => `${location.origin}/e/${S.id}#${S.key}`;
const plainUrl = () => `${location.origin}/e/${S.id}`;
const title = () => meta().title || T().untitled;
let pendingDecision: { d: Decision; label: string } | null = null;

/* ---------- loading ---------- */
export async function openPoll(id: string, key: string, prefer?: View) {
  Object.assign(S, {
    id, key, poll: null, members: [], admin: store.admin(id), mine: store.mine(id),
    draft: { trip: {}, time: new Set<string>() }, myBusy: null, connected: false, resNights: null, selWin: 0, saving: false, view: 'loading',
  });
  render();
  try {
    const p = await getPoll(id);
    const ok = await loadMembers(p);
    if (p.decided) S.view = 'decided';
    else if (!ok) S.view = 'badlink';
    else S.view = prefer ?? (S.mine ? 'results' : S.admin ? (p.responses.length ? 'results' : 'share') : 'respond');
    prefillDraft();
  } catch (e) {
    S.view = e instanceof ApiError && e.status === 404 ? 'notfound' : 'error';
  }
  history.replaceState({ view: S.view }, '', location.href);
  render();
}

/** Decrypt every response. Returns false if the link's key can't open them (a cut-off or wrong link). */
async function loadMembers(p: PollData): Promise<boolean> {
  S.poll = p;
  if (p.decided) { S.members = []; return true; }
  if (!S.key) return false;
  const m = p.meta, out: Member[] = [];
  let failed = 0;
  for (const r of p.responses) {
    try {
      const b = await decryptJson<Box>(S.key, r.box, ctx(r.rid));
      const mem: Member = { id: r.rid, name: String(b.n || '?').slice(0, 40), src: b.s === 'google' ? 'google' : 'manual', hue: hueFor(r.rid) };
      if (m.mode === 'trip' && m.trip) mem.trip = decodeTrip(m.trip, String(b.d));
      if (m.mode === 'time' && m.time) mem.time = decodeTime(m.time, String(b.d));
      out.push(mem);
    } catch { failed++; }
  }
  S.members = out;
  return !(p.responses.length && failed === p.responses.length);
}

function prefillDraft() {
  const me = S.members.find(x => x.id === S.mine?.rid);
  if (!me) return;
  if (me.trip) S.draft.trip = { ...me.trip };
  if (me.time) S.draft.time = new Set(me.time);
  if (!S.myName) S.myName = me.name;
}

async function reload() {
  const p = await getPoll(S.id);
  await loadMembers(p);
}

/* ---------- shared bits ---------- */
function evSub(): string {
  const t = T(), m = meta();
  if (m.mode === 'trip' && m.trip) return `${t.nights(m.trip.nights)} · ${fmtR(fmtD(m.trip.start), fmtD(m.trip.end))}`;
  if (m.time) return `${t.candDays(m.time.days.length)} · ${fmtR(fmtT(m.time.from), fmtT(m.time.to))}`;
  return '';
}
function coverSub(m: PollMeta): string {
  const t = T();
  if (m.mode === 'trip' && m.trip) return fmtR(t.dateShort(m.trip.start), t.dateShort(m.trip.end));
  const ds = [...(m.time?.days || [])].sort();
  return ds.length ? `${t.candDays(ds.length)} · ${fmtR(t.dateShort(ds[0]), t.dateShort(ds[ds.length - 1]))}` : '';
}
const coverName = () => (isCover(meta().cover) ? meta().cover : 'mountain');
const expiryNote = () => `<div class="expiry">${ICON.timer}<span>${T().deletesOn(expiryDate(S.poll!.expiresAt))}</span></div>`;
const isMine = (m: Member) => m.id === S.mine?.rid;
const memberName = (m: Member) => (isMine(m) ? `${m.name} (${T().you})` : m.name);

function decisionLabel(d: Decision): string {
  const t = T();
  if (d.startMin === undefined) return `${fmtR(fmtD(d.start), fmtD(d.end))} · ${t.nights(diffDays(d.start, d.end))}`;
  return `${fmtD(d.start)} ${fmtR(fmtT(d.startMin), fmtT(d.endMin ?? 1440))}`;
}

/* ---------- share (organizer, right after creating) ---------- */
export function vShare(): string {
  const t = T(), m = meta(), trip = m.mode === 'trip';
  return `
  <div class="cover top8"><canvas class="paint-cover" data-design="${coverName()}" aria-hidden="true"></canvas>
    <div class="over"><span></span>${langBtn()}</div>
    ${coverOverlay(t.shareCap, title(), coverSub(m))}
  </div>
  <div class="meta num">
    <span>${ICON.cal}${trip && m.trip ? fmtR(fmtD(m.trip.start), fmtD(m.trip.end)) : t.candDays(m.time?.days.length || 0)}</span>
    <span>${ICON.clock}${trip && m.trip ? t.nights(m.trip.nights) : m.time ? fmtR(fmtT(m.time.from), fmtT(m.time.to)) : ''}</span>
    <span>${ICON.people}${t.answered(S.members.length)}</span>
  </div>
  <section class="sec"><h2 class="title3">${t.inviteH}</h2>
    <div class="list url"><code id="share-url">${esc(shareUrl())}</code><button class="btn2" data-act="copy">${t.copy}</button></div>
    <div class="btn-row"><a class="btn2" href="${esc(lineUrl(shareUrl()))}" target="_blank" rel="noopener noreferrer">${ICON.bubble}${t.sendLine}</a><button class="btn2" data-act="share">${ICON.share}${t.shareOther}</button></div>
    <p class="foot pi">${t.shareNote}</p>
    ${expiryNote()}
    ${S.members.length ? `<button class="tlink center" data-act="go" data-v="results">${t.seeResults}</button>` : ''}
  </section>
  ${S.mine ? ctaBar('go', t.seeResults, { v: 'results' }) : ctaBar('go', t.tryRespond, { v: 'respond' })}`;
}
const lineUrl = (text: string) => `https://line.me/R/share?text=${encodeURIComponent(text)}`;

/* ---------- respond ---------- */
export function vRespond(): string {
  const t = T(), trip = meta().mode === 'trip', con = S.connected;
  const filled = trip ? Object.keys(S.draft.trip).length > 0 : S.draft.time.size > 0;
  const back: View | undefined = S.mine ? 'results' : S.admin ? 'share' : undefined;
  const calBlock = con
    ? `<div class="list"><div class="ri"><span class="gcal sm">${GCAL}</span><span class="k">${t.connected}</span><span class="ok">${ICON.check}${t.connOk}</span></div>
      <button class="ri danger" data-act="disconnect"><span class="k">${t.disconnect}</span></button></div>
      <div class="priv"><div>${ICON.lock}<span>${trip ? t.hintConnTrip : t.hintConnTime}</span></div></div>`
    : `<button class="connect" data-act="connect"><span class="gcal">${GCAL}</span><span class="k"><b>${t.connect}</b><span>${t.connectSub}</span></span>${ICON.chev}</button>
      <div class="priv"><div>${ICON.lock}<span>${t.priv1}</span></div></div>
      <button class="tlink center" data-act="manual">${t.orManual}</button>`;
  return `${navBar(title(), evSub(), back)}
  <section class="sec"><h2 class="title3">${t.stepName}</h2>
    <div class="list"><label class="ri"><input type="text" id="your-name" data-input="name" maxlength="40" autocomplete="nickname" value="${esc(S.myName)}" placeholder="${esc(t.namePh)}" aria-label="${t.stepName}"></label></div></section>
  <section class="sec"><h2 class="title3">${t.stepCal}</h2>${calBlock}</section>
  <section class="sec" id="avail"><div class="sec-h"><h2 class="title3">${trip ? t.stepTrip : t.stepTime}</h2>${trip ? `<button class="tlink hdr-btn" data-act="quickfill" aria-haspopup="menu" aria-expanded="false">${ICON.wand}${t.quickFill}</button>` : ''}</div>${trip ? respondTrip() : respondTime()}</section>
  ${ctaBar('submit', S.saving ? t.saving : S.mine ? t.update : t.submit, { off: !filled, busy: S.saving })}`;
}

function respondTrip(): string {
  const t = T(), m = meta(), tr = m.trip!, d = S.draft.trip;
  const filled = Object.keys(d).filter(k => k >= tr.start && k <= tr.end).length, len = diffDays(tr.start, tr.end) + 1;
  const cell = (k: string, day: number) => {
    if (k < tr.start || k > tr.end) return '<span class="rd out"></span>';
    const st = d[k] || '', bs = S.myBusy?.[k] || [];
    const e = S.connected && bs.length ? (bs.some(b => b.allDay) ? t.allDay : t.busyN(bs.length)) : holShort(k, m.tz);
    return `<button class="rd ${st} ${dayCls(k, m.tz)}" data-day="${k}" aria-label="${dayLabel(k, st)}"><span class="n">${day}</span><span class="e">${esc(e)}</span></button>`;
  };
  return `<div class="list pad col18">
    <div class="legend"><span><i class="dot o"></i>${t.lgO}</span><span><i class="dot m"></i>${t.lgM}</span><span><i class="dot x"></i>${t.lgX}</span></div>
    ${monthsBetween(tr.start, tr.end).map(ym => month(ym, cell, false)).join('')}
  </div>
  <div class="sec-h pi"><span class="foot">${t.dayDragHint}</span><span class="foot nowrap">${t.filled(filled, len)}</span></div>`;
}

const dayLabel = (k: string, st: DayStatus | '') => {
  const t = T(), name: Record<DayStatus, string> = { o: t.lgO, m: t.lgM, x: t.lgX };
  return `${fmtD(k)}: ${st ? name[st] : t.unfilled}`;
};
const NEXT: Record<DayStatus | '', DayStatus> = { '': 'o', o: 'm', m: 'x', x: 'o' };
export const nextDayState = (k: string) => NEXT[S.draft.trip[k] || ''];

/** Change one day in place (no re-render, so a swipe in progress keeps its element). */
export function setDay(el: HTMLElement, st: DayStatus) {
  const k = el.dataset.day!;
  S.draft.trip[k] = st;
  el.classList.remove('o', 'm', 'x');
  el.classList.add(st);
  el.setAttribute('aria-label', dayLabel(k, st));
  document.querySelectorAll('.rd.hot').forEach(x => x.classList.remove('hot'));
  el.classList.add('hot');
}

const hoursOf = (n: number) => (n / 2).toFixed(1).replace('.0', '');
function respondTime(): string {
  const t = T(), m = meta(), d = S.draft.time;
  const cell = (k: string, mm: number, c: string) => {
    const b = S.connected && !slotFree(S.myBusy?.[k] || [], mm);
    return `<span class="${c}${d.has(`${k}|${mm}`) ? ' on' : ''}${b ? ' busy' : ''}" data-paint data-k="${k}" data-t="${mm}"></span>`;
  };
  return `<div class="segc self-start" role="group"><button class="${S.paint ? 'on' : ''}" data-act="paint" data-v="1">${t.paint}</button><button class="${!S.paint ? 'on' : ''}" data-act="paint" data-v="0">${t.scroll}</button></div>
  <div class="list pad col14">
    <div class="legend"><span><i class="dot o sq"></i>${t.lgFree}</span><span><i class="dot busy"></i>${t.lgBusy}</span></div>
    ${timeGrid(m.time!, m.tz, cell, S.paint)}
  </div>
  <div class="sec-h pi"><span class="foot" id="slot-count">${t.hoursSel(hoursOf(d.size))}</span><button class="tlink" data-act="clear">${t.clear}</button></div>`;
}

export function updatePaintCount() {
  const el = $('#slot-count');
  if (el) el.textContent = T().hoursSel(hoursOf(S.draft.time.size));
  $('#cta-submit')?.classList.toggle('off', S.draft.time.size === 0);
}

async function connectCalendar() {
  const t = T(), m = meta();
  closeSheet();
  if (!googleAvailable) { toast(esc(t.googleUnavailable)); return; }
  const days = m.mode === 'trip' ? eachDay(m.trip!.start, m.trip!.end) : [...m.time!.days].sort();
  try {
    const p = fetchBusy(days[0], days[days.length - 1], m.tz);
    toast(`<span class="spin"></span>${esc(t.checking)}`);
    const intervals = await p;
    const busy = busyByDay(intervals, days, m.tz);
    S.myBusy = busy; // stays in memory for the hatching; never stored or sent
    if (m.mode === 'trip') S.draft.trip = tripFromBusy(m.trip!, busy);
    else S.draft.time = timeFromBusy(m.time!, busy);
    S.connected = true;
    render();
    toast(esc(t.filledToast));
  } catch (e) {
    const kind = e instanceof GoogleError ? e.kind : 'network';
    toast(esc(kind === 'cancelled' ? t.googleCancelled : kind === 'scope' ? t.googleScope : kind === 'unavailable' ? t.googleUnavailable : t.googleFailed));
  }
}

async function submit(el: HTMLElement) {
  const t = T(), m = meta();
  if (S.saving) return;
  if (el.classList.contains('off')) { toast(esc(t.needInput)); return; }
  const name = S.myName.trim();
  if (!name) { toast(esc(t.needName)); $('#your-name')?.focus(); return; }
  const prev = S.members.find(isMine);
  const mine = S.mine ?? { rid: randomToken(16), secret: randomToken() };
  const d = m.mode === 'trip' ? encodeTrip(m.trip!, S.draft.trip) : encodeTime(m.time!, S.draft.time);
  const box: Box = { n: name.slice(0, 40), s: S.connected ? 'google' : prev?.src ?? 'manual', d };
  S.saving = true; render();
  try {
    await putResponse(S.id, mine.rid, await encryptJson(S.key, box, ctx(mine.rid)), mine.secret);
    store.setMine(S.id, mine);
    store.setName(name);
    S.mine = mine;
    await reload();
    S.saving = false;
    go('results');
    toast(esc(t.submitted));
  } catch {
    S.saving = false; render();
    toast(esc(t.saveFailed));
  }
}

/* ---------- results ---------- */
export function vResults(): string {
  const t = T(), m = meta(), ms = S.members;
  const back: View = S.admin ? 'share' : 'respond';
  const body = !ms.length ? `<p class="foot pi">${t.noAnswers}</p>${inviteLink()}` : m.mode === 'trip' ? resultsTrip() : resultsTime();
  return `${navBar(title(), evSub(), back)}
  ${body}
  <section class="sec"><div class="sec-h"><h2 class="title3">${t.whoAnswered}</h2><span class="foot">${ms.length}</span></div>
    ${ms.length ? `<div class="list">${ms.map(x => `<div class="ri">${av(x)}<span class="k">${esc(memberName(x))}</span><span class="v fs15">${x.src === 'google' ? t.srcGoogle : t.srcManual}</span></div>`).join('')}</div>` : ''}
    <div class="priv"><div>${ICON.lock}<span>${t.resPrivacy}</span></div></div>
    ${expiryNote()}
  </section>
  ${S.admin ? `<section class="sec"><div class="list"><button class="ri danger" data-act="askdelete"><span class="k">${t.deleteNow}</span></button></div></section>` : ''}
  ${ctaBar('go', S.mine ? t.editMine : t.answerToo, { v: 'respond' })}`;
}

function heroCard(cap: string, ttl: string, sub: string, ok: number, total: number, per: { m: Member; w: DayStatus }[], btn: string, i: number) {
  const t = T();
  return `<div class="hero">
    <div><div class="cap">${esc(cap)}</div><div class="title2 num">${esc(ttl)}</div><div class="foot hero-sub">${esc(sub)}</div></div>
    <div class="sc"><div class="stack">${per.map(({ m, w }) => av(m, w)).join('')}</div>
      <div class="tr">${ok === total ? `<span class="tag">${ICON.check}${t.allOk}</span>` : `<div class="big">${ok}<small>${esc(t.of(total))}</small></div>`}</div></div>
    <div class="who">${per.map(({ m, w }) => `<span><i class="dot ${w}"></i>${esc(memberName(m))}</span>`).join('')}</div>
    ${S.admin ? `<button class="pick" data-act="decide" data-v="${i}">${esc(btn)}</button>` : `<p class="foot hero-sub">${t.organizerPicks}</p>`}
  </div>`;
}

let lastPick: Decision[] = [];

/** Small blue link right under the top card, back to the invite link (organizer only). */
const inviteLink = () => (S.admin ? `<button class="tlink invite-link" data-act="go" data-v="share">${ICON.link}${T().inviteMore}</button>` : '');
const SHOWN_OPTIONS = 3;

/** "Other options", three at first; See all opens the rest. */
function otherOptions(rows: string[]): string {
  if (!rows.length) return '';
  const t = T(), shown = S.showAll ? rows : rows.slice(0, SHOWN_OPTIONS);
  const more = rows.length > SHOWN_OPTIONS ? `<button class="tlink" data-act="seeall">${S.showAll ? t.showLess : t.seeAll(rows.length)}</button>` : '';
  return `<section class="sec"><div class="sec-h"><h2 class="title3">${t.others}</h2>${more}</div><div class="list">${shown.join('')}</div></section>`;
}

function resultsTrip(): string {
  const t = T(), m = meta(), tr = m.trip!, n = S.resNights ?? tr.nights, ms = S.members, total = ms.length;
  const pick = tripWindows(tr, ms, n, 40);
  lastPick = pick.map(w => ({ start: w.s, end: w.e }));
  const si = Math.min(S.selWin, Math.max(0, pick.length - 1)), sel = pick[si];
  const lbl = (w: { s: string; e: string }) => fmtR(fmtD(w.s), fmtD(w.e));
  const sub = (w: { mb: number }) => `${t.nights(n)}${w.mb ? ' · ' + t.maybeN(w.mb) : ''}`;
  const hero = sel ? heroCard(si === 0 ? t.bestCap : `${t.others} · ${si + 1}`, lbl(sel), sub(sel), sel.ok, total, sel.per, t.decideTrip, si) : `<p class="foot pi">${t.noWin}</p>`;
  const rows = pick.flatMap((w, i) => (i === si ? [] : [`<button class="ri opt" data-act="selwin" data-v="${i}"><span class="k"><b class="num">${esc(lbl(w))}</b><span>${esc(sub(w))}</span></span><span class="score">${w.ok}<small>${esc(t.of(total))}</small></span>${ICON.chev}</button>`]));
  const heat = (k: string, d: number) => {
    if (k < tr.start || k > tr.end) return '<span class="hd out"></span>';
    const o = ms.filter(x => x.trip?.[k] === 'o').length, mb = ms.filter(x => x.trip?.[k] === 'm').length;
    const inw = sel && k >= sel.s && k <= sel.e;
    return `<button class="hd ${dayCls(k, m.tz)} ${heatClass(o + mb * 0.5, total)} ${inw ? 'inwin' : ''}" data-act="dayinfo" data-v="${k}" aria-label="${fmtD(k)} ${o}/${total}"><span class="n">${d}<small>${o}/${total}</small></span></button>`;
  };
  return `
  <div class="list"><div class="ri"><span class="k">${t.tripLen}</span>${nightsVal(n)}${stepper('resn', n, 0, MAX_NIGHTS)}</div></div>
  ${hero}
  ${inviteLink()}
  ${otherOptions(rows)}
  <section class="sec"><h2 class="title3">${t.perDay}</h2>${heatLegend(total)}
    <div class="list pad col18">${monthsBetween(tr.start, tr.end).map(ym => month(ym, heat, false)).join('')}</div>
    <p class="foot pi">${t.perDayNote}</p></section>`;
}

function resultsTime(): string {
  const t = T(), m = meta(), tm = m.time!, ms = S.members, total = ms.length;
  const pick = timeBest(tm, ms, 40);
  lastPick = pick.map(s => ({ start: s.k, end: s.k, startMin: s.s, endMin: s.e }));
  const si = Math.min(S.selWin, Math.max(0, pick.length - 1)), sel = pick[si];
  const range = (s: { s: number; e: number }) => fmtR(fmtT(s.s), fmtT(s.e));
  const per = (s: { who: Member[] }) => ms.map(x => ({ m: x, w: (s.who.includes(x) ? 'o' : 'x') as DayStatus }));
  const hero = sel ? heroCard(si === 0 ? t.bestCap : `${t.others} · ${si + 1}`, fmtD(sel.k), `${range(sel)} · ${t.dur(sel.e - sel.s)}`, sel.who.length, total, per(sel), t.decideTime, si) : `<p class="foot pi">${t.noSlot}</p>`;
  const rows = pick.flatMap((s, i) => (i === si ? [] : [`<button class="ri opt" data-act="selwin" data-v="${i}"><span class="k"><b class="num">${fmtD(s.k)}</b><span class="num">${esc(range(s))} · ${t.dur(s.e - s.s)}</span></span><span class="score">${s.who.length}<small>${esc(t.of(total))}</small></span>${ICON.chev}</button>`]));
  const cell = (k: string, mm: number, c: string) => {
    const cnt = ms.filter(x => x.time?.has(`${k}|${mm}`)).length;
    return `<span class="${c} heat ${heatClass(cnt, total)}" data-act="slotinfo" data-v="${k}|${mm}" role="button" aria-label="${fmtD(k)} ${fmtT(mm)} ${cnt}/${total}"></span>`;
  };
  return `
  ${hero}
  ${inviteLink()}
  ${otherOptions(rows)}
  <section class="sec"><h2 class="title3">${t.perTime}</h2>${heatLegend(total, true)}
    <div class="list pad">${timeGrid(tm, m.tz, cell)}</div>
    <p class="foot pi">${t.perTimeNote}</p></section>`;
}

const peopleList = (arr: { m: Member; w: DayStatus }[]) =>
  arr.length ? `<div class="list">${arr.map(({ m, w }) => `<div class="ri">${av(m, w)}<span class="k">${esc(memberName(m))}</span></div>`).join('')}</div>` : `<p class="foot">${T().nobody}</p>`;

/* ---------- decided ---------- */
export function vDecided(): string {
  const t = T(), p = S.poll!, m = p.meta, d = p.decided!;
  const label = decisionLabel(d);
  return `
  <div class="cover top8"><canvas class="paint-cover" data-design="${coverName()}" aria-hidden="true"></canvas>
    <div class="over"><span></span>${langBtn()}</div>
    ${coverOverlay(t.setFor, title(), label)}
  </div>
  <section class="sec">
    <div class="stack-btns">
      <a class="cta" href="${esc(googleCalendarUrl(title(), d, m.tz, plainUrl()))}" target="_blank" rel="noopener noreferrer"><span class="gcal sm">${GCAL}</span>${t.addGoogle}</a>
      <button class="btn2" data-act="ics">${ICON.cal}${t.addApple}</button>
      ${S.admin ? `<button class="btn2" data-act="message">${ICON.bubble}${t.shareMsg}</button>` : ''}
    </div>
    <div class="expiry">${ICON.timer}<span>${t.decidedNote(expiryDate(p.expiresAt))}</span></div>
  </section>
  ${S.admin ? `<section class="sec"><div class="list"><button class="ri danger" data-act="askdelete"><span class="k">${t.deleteNow}</span></button></div></section>` : ''}
  ${footer()}`;
}

function openMessage() {
  const t = T(), p = S.poll!, label = decisionLabel(p.decided!);
  const text = t.msg(title(), label, plainUrl());
  sheet(`<h3 class="title2">${t.msgH}</h3>
    <textarea class="msg" id="decide-msg" aria-label="${t.msgH}">${esc(text)}</textarea>
    <div class="btn-row"><a class="btn2" id="line-msg" href="${esc(lineUrl(text))}" target="_blank" rel="noopener noreferrer">${ICON.bubble}${t.sendLine}</a><button class="btn2" data-act="sharemsg">${ICON.share}${t.shareOther}</button></div>
    <button class="cta" data-act="copymsg">${ICON.copy}${t.copy}</button>`);
}

/* ---------- after render ---------- */
export function afterEvent() {
  document.querySelectorAll<HTMLCanvasElement>('canvas.paint-cover').forEach(c => drawCover(c));
  applyDynamicStyles();
  bindTimeGrids();
  if (S.view === 'respond' && !S.connected) preloadGoogle()?.catch(() => {});
}

/* ---------- actions ---------- */
async function copyText(text: string, fallback: () => void, done: string) {
  try { await navigator.clipboard.writeText(text); toast(esc(done)); } catch { fallback(); toast(esc(T().urlSelected)); }
}
function selectNode(sel: string) {
  const el = $(sel);
  if (!el) return;
  if (el instanceof HTMLTextAreaElement) { el.select(); return; }
  const r = document.createRange(); r.selectNodeContents(el);
  const s = getSelection(); s?.removeAllRanges(); s?.addRange(r);
}
async function nativeShare(data: ShareData) {
  try { if (navigator.share) await navigator.share(data); else await copyText(data.text || data.url || '', () => {}, T().copied); } catch { /* cancelled */ }
}

/* Quick fill overwrites many days at once, so each one can be undone from its confirmation. */
let undoTrip: Record<string, DayStatus> | null = null;
const remember = () => { undoTrip = { ...S.draft.trip }; };
const undoToast = (msg: string) => toast(`<span>${esc(msg)}</span><button class="toast-btn" data-act="undofill">${esc(T().undo)}</button>`, 4500);

export const eventActions: Record<string, (v: string, el: HTMLElement) => void> = {
  copy() { void copyText(shareUrl(), () => selectNode('#share-url'), T().copied); },
  share() { void nativeShare({ title: title(), url: shareUrl() }); },
  connect() {
    const t = T();
    sheet(`<div><h3 class="title2">${t.sheetConnH}</h3><p class="sub mt6">${t.sheetConnLead}</p></div>
      <div class="sec"><div class="foot pi">${t.reads}</div>
        <div class="list"><div class="ri"><span class="ok">${ICON.check}</span><span class="k">${t.readsBusy}</span></div></div></div>
      <div class="sec"><div class="foot pi">${t.notReads}</div>
        <div class="list"><div class="ri"><span class="k">${t.nr1}</span></div><div class="ri"><span class="k">${t.nr2}</span></div><div class="ri"><span class="k">${t.nr3}</span></div></div>
        <p class="foot pi">${t.afterUse}</p></div>
      <button class="cta" data-act="doconnect">${t.allow}</button><button class="tlink center" data-act="closesheet">${t.cancel}</button>`);
  },
  doconnect() { void connectCalendar(); },
  disconnect() { S.connected = false; S.myBusy = null; render(); },
  manual() { $('#avail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast(esc(T().manualToast)); },
  quickfill(_v, el) {
    const t = T();
    openMenu(el, [
      { act: 'weekends', label: t.weekendsOnly, icon: ICON.weekend },
      { act: 'fillrest', label: t.fillRest, icon: ICON.fillRest },
      { act: 'clearall', label: t.clearAll, icon: ICON.trash, danger: true, gapBefore: true },
    ]);
  },
  undofill() {
    if (!undoTrip) return;
    S.draft.trip = undoTrip; undoTrip = null;
    $('#toast')!.hidden = true;
    render();
  },
  clearall() { remember(); S.draft.trip = {}; render(); undoToast(T().cleared); },
  weekends() {
    // weekdays → busy; weekends and holidays → free (or what the calendar says, if connected)
    remember();
    const m = meta();
    for (const k of eachDay(m.trip!.start, m.trip!.end)) {
      const off = dow(k) === 0 || dow(k) === 6 || !!holidayName(k, m.tz);
      S.draft.trip[k] = !off ? 'x' : S.connected && S.myBusy ? dayStatus(S.myBusy[k] || []) : 'o';
    }
    render();
    undoToast(T().filledWeekends);
  },
  tgnav(v, el) { pageTimeGrid(el, Number(v)); },
  seeall() { S.showAll = !S.showAll; render(); },
  fillrest() { remember(); const tr = meta().trip!; for (const k of eachDay(tr.start, tr.end)) if (!S.draft.trip[k]) S.draft.trip[k] = 'o'; render(); undoToast(T().filledRest); },
  paint(v) { S.paint = v === '1'; render(); },
  clear() { S.draft.time = new Set(); render(); },
  submit(_v, el) { void submit(el); },
  resn(v) { S.showAll = false; S.resNights = Math.min(MAX_NIGHTS, Math.max(0, (S.resNights ?? meta().trip!.nights) + Number(v))); S.selWin = 0; render(); },
  selwin(v) { S.selWin = Number(v); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  decide(v) {
    const t = T(), d = lastPick[Number(v)];
    if (!d || !S.admin) return;
    const label = decisionLabel(d);
    pendingDecision = { d, label };
    sheet(`<div><div class="foot">${t.decideCap}</div><h3 class="title2 num">${esc(label)}</h3></div>
      <p class="warn">${t.decideWarn}</p>
      <button class="cta" data-act="confirmdecide">${t.confirmDecide}</button><button class="tlink center" data-act="closesheet">${t.cancel}</button>`);
  },
  confirmdecide(_v, el) { void confirmDecide(el); },
  message() { openMessage(); },
  copymsg() { const v = ($<HTMLTextAreaElement>('#decide-msg'))?.value || ''; void copyText(v, () => selectNode('#decide-msg'), T().copied); },
  sharemsg() { void nativeShare({ text: ($<HTMLTextAreaElement>('#decide-msg'))?.value || '' }); },
  ics() {
    const p = S.poll!;
    const blob = new Blob([icsFile(S.id, title(), p.decided!, p.meta.tz, plainUrl())], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'letsmeet.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  },
  askdelete() {
    const t = T();
    sheet(`<div><h3 class="title2">${t.deleteH}</h3><p class="sub mt6">${t.deleteLead}</p></div>
      <button class="cta danger-cta" data-act="dodelete">${t.deleteYes}</button><button class="tlink center" data-act="closesheet">${t.cancel}</button>`);
  },
  dodelete() { void doDelete(); },
  dayinfo(v) {
    const t = T(), g = (s: DayStatus) => S.members.filter(x => (x.trip?.[v] || 'x') === s).map(m => ({ m, w: s }));
    sheet(`<h3 class="title2 num">${fmtD(v)}</h3>
      <div class="sec"><div class="foot">${t.canGo}</div>${peopleList(g('o'))}</div>
      <div class="sec"><div class="foot">${t.maybe}</div>${peopleList(g('m'))}</div>
      <div class="sec"><div class="foot">${t.cant}</div>${peopleList(g('x'))}</div>
      <button class="cta" data-act="closesheet">${t.close}</button>`);
  },
  slotinfo(v) {
    const t = T(), [k, mm] = v.split('|'), id = `${k}|${mm}`, to = Math.min(Number(mm) + 30, meta().time!.to);
    const yes = S.members.filter(x => x.time?.has(id)).map(m => ({ m, w: 'o' as DayStatus }));
    const no = S.members.filter(x => !x.time?.has(id)).map(m => ({ m, w: 'x' as DayStatus }));
    sheet(`<h3 class="title2 num">${fmtD(k)}<br><span class="sub">${fmtR(fmtT(Number(mm)), fmtT(to))}</span></h3>
      <div class="sec"><div class="foot">${t.canGo} · ${yes.length}</div>${peopleList(yes)}</div>
      <div class="sec"><div class="foot">${t.cant} · ${no.length}</div>${peopleList(no)}</div>
      <button class="cta" data-act="closesheet">${t.close}</button>`);
  },
};

async function confirmDecide(el: HTMLElement) {
  const t = T();
  if (!pendingDecision || !S.admin || el.hasAttribute('disabled')) return;
  el.setAttribute('disabled', ''); el.textContent = t.deciding;
  try {
    const { expiresAt } = await decidePoll(S.id, pendingDecision.d, S.admin);
    S.poll = { ...S.poll!, decided: pendingDecision.d, expiresAt, responses: [] };
    S.members = [];
    closeSheet();
    go('decided');
    openMessage();
  } catch {
    el.removeAttribute('disabled'); el.textContent = t.confirmDecide;
    toast(esc(t.decideFailed));
  }
}

async function doDelete() {
  const t = T();
  if (!S.admin) return;
  try {
    await deletePoll(S.id, S.admin);
    store.forget(S.id);
    closeSheet();
    navigate('/');
    toast(esc(t.deleted));
  } catch { toast(esc(t.decideFailed)); }
}
