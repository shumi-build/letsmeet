import { describe, expect, it, vi } from 'vitest';
vi.mock('../app/src/state', () => ({ T: () => ({}) }));
const { heatClass, heatStep } = await import('../app/src/ui/heat');

describe('availability colours', () => {
  it('small group: each missing person is one step', () => {
    expect(heatStep(5)).toBe(1);
    expect([5, 4, 3, 2, 1, 0].map(a => heatClass(a, 5))).toEqual(['h-all', 'h-1', 'h-2', 'h-3', 'h-3', 'h-none']);
  });
  it('pair: one missing is yellow, both missing is grey', () => {
    expect([2, 1, 0].map(a => heatClass(a, 2))).toEqual(['h-all', 'h-1', 'h-none']);
  });
  it('big group: steps widen so one or two absences still read as nearly everyone', () => {
    expect(heatStep(18)).toBe(3);
    expect(heatClass(16, 18)).toBe('h-1');
    expect(heatClass(13, 18)).toBe('h-2');
    expect(heatClass(5, 18)).toBe('h-3');
  });
  it('a maybe counts as half a person', () => {
    expect(heatClass(4.5, 5)).toBe('h-1');
  });
});
