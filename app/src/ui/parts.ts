import { S, T, type View } from '../state';
import { esc, ICON } from './dom';

export const langBtn = () =>
  `<button class="lang" data-act="lang" data-v="${S.lang === 'en' ? 'ja' : 'en'}" lang="${S.lang === 'en' ? 'ja' : 'en'}">${T().switchTo}</button>`;

export function navBar(title: string, sub: string, back?: View) {
  const left = back ? `<button class="circle" data-act="go" data-v="${back}" aria-label="${T().back}">${ICON.back}</button>` : '<span></span>';
  return `<header class="nav">${left}<div class="nav-t"><div class="headline">${esc(title)}</div>${sub ? `<div class="cap num">${esc(sub)}</div>` : ''}</div>${langBtn()}</header>`;
}

export const ctaBar = (act: string, label: string, opts: { v?: string; off?: boolean; busy?: boolean } = {}) =>
  `<div class="bar"><button class="cta${opts.off ? ' off' : ''}" id="cta-${act}" data-act="${act}" data-v="${esc(opts.v || '')}"${opts.busy ? ' disabled' : ''}>${esc(label)}<span class="arr">${ICON.arrow}</span></button></div>`;

export const stepper = (act: string, val: number, min: number, max: number) =>
  `<span class="stepper"><button data-act="${act}" data-v="-1" ${val <= min ? 'disabled' : ''} aria-label="${T().less}">${ICON.minus}</button><button data-act="${act}" data-v="1" ${val >= max ? 'disabled' : ''} aria-label="${T().more}">${ICON.plus}</button></span>`;

export const nightsVal = (n: number) => {
  const t = T();
  return n === 0 ? `<span class="nval">${t.dayTrip}</span>` : `<span class="nval">${n} ${t.nightsN(n)}<small>${t.daysN(n + 1)}</small></span>`;
};

export const coverOverlay = (cap: string, title: string, sub: string) =>
  `<span class="scrim"></span><div class="ttl"><div class="cap" data-cv-cap>${esc(cap)}</div><div class="title2" data-cv-title>${esc(title)}</div><div class="tsub" data-cv-sub>${esc(sub)}</div></div>`;

export const footer = () =>
  `<nav class="foot-links"><a href="/privacy" data-link>${T().privacy}</a></nav>`;
