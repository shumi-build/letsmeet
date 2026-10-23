// Tiny router: real URLs for pages (/, /e/:id, /privacy), history entries for screens inside a plan.
import { S, render, type View } from './state';

let routeFn: () => void = () => {};
export const onRoute = (fn: () => void) => { routeFn = fn; };

/** Go to another page (path + optional #key). */
export function navigate(url: string, view?: View) {
  history.pushState({ view }, '', url);
  routeFn();
}

/** Switch screens inside the current page, with a history entry so the phone's back gesture works. */
export function go(view: View) {
  if (S.view === view) return;
  history.pushState({ view }, '', location.href);
  S.view = view;
  S.selWin = 0;
  S.showAll = false;
  render();
  window.scrollTo(0, 0);
}
