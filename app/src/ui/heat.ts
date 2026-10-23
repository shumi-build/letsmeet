// Availability colours: everyone → green, one band short → yellow, two bands short → pale yellow,
// further short → faint yellow, nobody → grey. A "band" grows with the group so that a
// 20-person trip isn't all yellow: about one sixth of the group per band, at least one person.
import { T } from '../state';
import { esc } from './dom';

export const heatStep = (total: number) => Math.max(1, Math.round(total / 6));

/** `avail` may count a "maybe" as half a person. */
export function heatClass(avail: number, total: number): string {
  if (!total || avail <= 0) return 'h-none';
  const missing = total - avail;
  if (missing <= 0) return 'h-all';
  const band = Math.ceil(missing / heatStep(total));
  return band === 1 ? 'h-1' : band === 2 ? 'h-2' : 'h-3';
}

export function heatLegend(total: number, square = false): string {
  const t = T(), s = heatStep(total), most = total - 1;
  const items: [string, string][] = [['h-all', t.heatAll]];
  if (most >= 1) items.push(['h-1', t.heatShort(1, Math.min(s, most))]);
  if (most > s) items.push(['h-2', t.heatShort(s + 1, Math.min(2 * s, most))]);
  if (most > 2 * s) items.push(['h-3', t.heatMore(2 * s + 1)]);
  items.push(['h-none', t.heatNone]);
  return `<div class="scale">${items.map(([c, l]) => `<span><i class="${c}${square ? ' sq' : ''}"></i>${esc(l)}</span>`).join('')}</div>`;
}
