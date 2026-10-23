// iOS-style pull-down menu (UIMenu look): a frosted panel anchored to the button that opened it.
// Items carry data-act, so the normal click handler runs them; any tap closes the menu.
import { esc } from './dom';

export interface MenuItem { act: string; label: string; icon: string; danger?: boolean; gapBefore?: boolean }

export const menuOpen = () => !!document.querySelector('.menu');
let openedAtY = 0;
/** Like iOS, scrolling the page dismisses the menu — but not a few pixels of incidental movement. */
export const scrolledAway = () => Math.abs(window.scrollY - openedAtY) > 12;

export function closeMenu() {
  document.querySelectorAll('.menu,.menu-scrim').forEach(e => e.remove());
  document.querySelectorAll('[aria-expanded="true"]').forEach(e => e.setAttribute('aria-expanded', 'false'));
}

export function openMenu(anchor: HTMLElement, items: MenuItem[]) {
  closeMenu();
  const t = document.getElementById('toast');
  if (t) t.hidden = true;
  const scrim = document.createElement('div');
  scrim.className = 'menu-scrim';
  const m = document.createElement('div');
  m.className = 'menu';
  m.setAttribute('role', 'menu');
  m.innerHTML = items.map(i =>
    `${i.gapBefore ? '<div class="menu-gap" role="separator"></div>' : ''}<button role="menuitem" data-act="${i.act}" class="${i.danger ? 'danger' : ''}"><span>${esc(i.label)}</span>${i.icon}</button>`).join('');
  document.body.append(scrim, m);
  const r = anchor.getBoundingClientRect(), h = m.offsetHeight, below = r.bottom + 8 + h < window.innerHeight;
  m.style.right = `${Math.max(16, window.innerWidth - r.right)}px`;
  m.style.top = `${below ? r.bottom + 8 : Math.max(16, r.top - 8 - h)}px`;
  m.style.transformOrigin = below ? 'top right' : 'bottom right';
  openedAtY = window.scrollY;
  anchor.setAttribute('aria-expanded', 'true');
  m.querySelector('button')?.focus({ preventScroll: true });
}
