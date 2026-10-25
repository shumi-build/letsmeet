// The home page at "/": what Let's Meet does, how Google Calendar data is handled (what Google's
// branding review looks for), a way into the app, and the source code. About two phone screens long.
import { T } from '../state';
import { av, esc, ICON, applyDynamicStyles } from '../ui/dom';
import { drawCover } from '../ui/covers';
import { coverOverlay, langBtn } from '../ui/parts';

// Upstream source. Forks can point this at their own repository.
const SOURCE_URL: string = import.meta.env.VITE_SOURCE_URL || 'https://github.com/shumi-build/letsmeet';

const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="6" width="26" height="23" rx="6" fill="currentColor"/><rect x="9" y="3" width="3" height="7" rx="1.5" fill="currentColor"/><rect x="20" y="3" width="3" height="7" rx="1.5" fill="currentColor"/><circle cx="13" cy="18.5" r="4" fill="var(--bg)"/><circle cx="19" cy="18.5" r="4" fill="var(--bg)" opacity=".6"/></svg>';
const GITHUB = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
const SHIELD = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 2.5 3.5v4c0 3.3 2.3 6 5.5 7 3.2-1 5.5-3.7 5.5-7v-4L8 1.5Z" fill="currentColor"/><path d="m5.5 8 1.7 1.7L10.7 6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PHONE = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="1.5" width="8" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 12.2h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const CODE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TILE_ICONS = [PHONE, ICON.lock, ICON.timer, CODE];

// A few made-up friends for the floating example cards.
const FRIENDS = ['#5E7CE2', '#E26A8D', '#E08A3C', '#9A6AE0'].map((hue, i) => ({ name: 'YSHM'[i], hue }));

function floatCard(cls: string, design: string, cap: string, title: string, sub: string, free: number) {
  const people = FRIENDS.map((f, i) => av(f, i < free ? 'o' : 'x')).join('');
  return `<div class="fcard ${cls}"><canvas class="paint-cover" data-design="${design}"></canvas>
    <div class="fstack stack">${people}</div>${coverOverlay(cap, title, sub)}</div>`;
}

export function vHome(): string {
  const t = T(), d = t.demo;
  const ctaLink = `<a class="cta" href="/new" data-link>${esc(t.makePlan)}<span class="arr">${ICON.arrow}</span></a>`;
  return `
  <header class="home-top"><a class="home-brand" href="/" data-link>${MARK}<span>Let's Meet</span></a>${langBtn()}</header>

  <section class="home-hero">
    <div class="float-stack" aria-hidden="true">
      ${floatCard('f1', 'snow', d.tripCap, d.trip, d.tripSub, 4)}
      ${floatCard('f2', 'dinner', d.dinnerCap, d.dinner, d.dinnerSub, 4)}
      ${floatCard('f3', 'mahjong', d.mahjongCap, d.mahjong, d.mahjongSub, 3)}
    </div>
    <h1 class="home-h1">${t.homeH1.split(/(?<=、)/).map(p => `<span class="nb">${esc(p)}</span>`).join('')}</h1>
    <p class="home-lead">${esc(t.homeLead)}</p>
    ${ctaLink}
    <p class="foot tc">${esc(t.homeFine)}</p>
  </section>

  <section class="sec">
    <h2 class="title2">${esc(t.howTitle)}</h2>
    <ol class="how">${t.howSteps.map(([h, p], i) => `<li><span class="how-n">${i + 1}</span><div><b>${esc(h)}</b><p>${esc(p)}</p></div></li>`).join('')}</ol>
  </section>

  <section class="sec">
    <div class="trust-head"><span class="trust-badge">${SHIELD}${esc(t.privBadge)}</span>
      <h2 class="title2">${esc(t.privTitle)}</h2><p class="sub">${esc(t.privLead)}</p></div>
    <div class="see" aria-label="${esc(t.seeCaption)}">
      <div class="see-col"><div class="see-h">${esc(t.seeYours)}</div>
        ${t.seeEvents.map(([tm, name], i) => `<div class="ev ev-${i}"><span>${esc(tm)}</span><b>${esc(name)}</b></div>`).join('')}</div>
      <span class="see-arrow">${ICON.arrow}</span>
      <div class="see-col"><div class="see-h">${esc(t.seeOurs)}</div>
        ${t.seeEvents.map(([tm]) => `<div class="ev ev-busy"><span>${esc(tm)}</span><b>${ICON.lock}${esc(t.busyWord)}</b></div>`).join('')}</div>
    </div>
    <p class="see-cap">${ICON.check}${esc(t.seeCaption)}</p>
    <div class="tiles">${t.privTiles.map(([h, p], i) => `<div class="tile"><span class="tile-ico">${TILE_ICONS[i]}</span><b>${esc(h)}</b><span>${esc(p)}</span></div>`).join('')}</div>
    <a class="tlink" href="/privacy" data-link>${esc(t.privLink)} ›</a>
  </section>

  <section class="sec">
    <a class="list ri gh" href="${esc(SOURCE_URL)}" target="_blank" rel="noopener noreferrer"><span class="gh-ico">${GITHUB}</span><span class="k"><b>${esc(t.ghTitle)}</b><span>${esc(SOURCE_URL.replace(/^https:\/\//, ''))}</span></span>${ICON.chev}</a>
  </section>

  <section class="home-final">
    <h2 class="title2">${esc(t.finalH)}</h2>
    ${ctaLink}
  </section>

  <nav class="foot-links"><a href="/privacy" data-link>${esc(t.privacy)}</a><a href="${esc(SOURCE_URL)}" target="_blank" rel="noopener noreferrer">GitHub</a></nav>`;
}

export function afterHome() {
  document.querySelectorAll<HTMLCanvasElement>('canvas.paint-cover').forEach(c => drawCover(c));
  applyDynamicStyles();
}
