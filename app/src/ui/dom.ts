export const $ = <E extends Element = HTMLElement>(s: string) => document.querySelector<E>(s) as E | null;
export const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const ICON = {
  back: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  calL: '<svg viewBox="0 0 11 18" aria-hidden="true"><path d="M9 2 2 9l7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  calR: '<svg viewBox="0 0 11 18" aria-hidden="true"><path d="m2 2 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  minus: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h10M7 2v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="2" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  timer: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 6v3.2l2 1.3M6.3 1.8h3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  cal: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 8.2h15M6.5 2.2v3.6M13.5 2.2v3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.3 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  people: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6" cy="5.5" r="2.5" fill="currentColor"/><circle cx="11.2" cy="6" r="2" fill="currentColor" opacity=".6"/><path d="M1.5 13.5c.4-2.6 2.2-4 4.5-4s4.1 1.4 4.5 4" fill="currentColor"/><path d="M10.5 9.6c1.9 0 3.3 1.2 3.8 3.4" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".6" stroke-linecap="round"/></svg>',
  link: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.6 11.4a3.2 3.2 0 0 0 4.5 0l3-3a3.2 3.2 0 0 0-4.5-4.5l-1.2 1.2M11.4 8.6a3.2 3.2 0 0 0-4.5 0l-3 3a3.2 3.2 0 0 0 4.5 4.5l1.2-1.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wand: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 17 9.5-9.5M11 6l3 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M15 2.5v3M13.5 4h3M17 9v2.4M15.8 10.2h2.4M8 2.8v2M7 3.8h2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  weekend: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8.2h15M6.5 2.2v3.6M13.5 2.2v3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="5" y="10.5" width="2.6" height="2.6" rx=".6" fill="currentColor"/><rect x="12.4" y="10.5" width="2.6" height="2.6" rx=".6" fill="currentColor"/></svg>',
  fillRest: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m6.8 10.2 2.2 2.2 4.3-4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V3.8h4v1.7M5.2 5.5l.8 11h8l.8-11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="m3.5 8.3 3 3 6-6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copy: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M13 7V5.5A2.5 2.5 0 0 0 10.5 3h-5A2.5 2.5 0 0 0 3 5.5v5A2.5 2.5 0 0 0 5.5 13H7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  bubble: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9.5C3 6 6.1 3.5 10 3.5S17 6 17 9.5 13.9 15.5 10 15.5c-.8 0-1.6-.1-2.3-.3L4 16.5l1-3C3.7 12.4 3 11 3 9.5Z" fill="currentColor"/></svg>',
  share: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 12.5V2.8M6.5 6 10 2.5 13.5 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 9H5.5A1.5 1.5 0 0 0 4 10.5v5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 14.5 9h-1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

// Simplified Google Calendar-style mark. Before launch, swap in Google's official asset per their branding guidelines.
export const GCAL = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 4h28v6H10z" fill="#4285F4"/><path d="M38 10h6v28h-6z" fill="#4285F4"/><path d="M10 38h28v6H10z" fill="#34A853"/><path d="M4 10h6v28H4z" fill="#FBBC04"/><path d="M10 4H8a4 4 0 0 0-4 4v2h6z" fill="#1967D2"/><path d="M38 4h2a4 4 0 0 1 4 4v2h-6z" fill="#1967D2"/><path d="M4 38v2a4 4 0 0 0 4 4h2v-6z" fill="#188038"/><path d="M38 38h6l-6 6z" fill="#EA4335"/><rect x="10" y="10" width="28" height="28" fill="#fff"/><text x="24" y="31.5" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="17" font-weight="700" fill="#4285F4">31</text></svg>';

const HUES = ['#5E7CE2', '#E26A8D', '#E08A3C', '#9A6AE0', '#2FA36B', '#D4574E', '#3A9BB8', '#B8860B'];
export function hueFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** Avatar circle. Colours are applied after render (CSP forbids nothing here, but keeps markup tidy). */
export const av = (m: { name: string; hue: string }, st?: string) =>
  `<span class="av" data-hue="${esc(m.hue)}">${esc((m.name || '?').slice(0, 1).toUpperCase())}${st ? `<i class="${st}"></i>` : ''}</span>`;

let toastT: number | undefined;
export function toast(html: string, ms = 2600) {
  const el = $('#toast')!;
  el.innerHTML = html;
  el.hidden = false;
  clearTimeout(toastT);
  toastT = window.setTimeout(() => (el.hidden = true), ms);
}
export function sheet(html: string) {
  const s = $('#sheet')!;
  s.innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true"><span class="grab"></span>${html}</div>`;
  s.hidden = false;
  applyDynamicStyles(s);
}
export const closeSheet = () => { $('#sheet')!.hidden = true; };

/** Values that vary per element (avatar colour, grid columns) are set through the DOM, not inline markup. */
export function applyDynamicStyles(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-hue]').forEach(e => { e.style.background = e.dataset.hue!; });
  root.querySelectorAll<HTMLElement>('[data-cols]').forEach(e => { e.style.setProperty('--cols', e.dataset.cols!); });
}
