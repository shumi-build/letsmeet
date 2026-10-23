import { describe, expect, it } from 'vitest';
import { googleCalendarUrl, icsFile } from '../app/src/lib/calendarLink';

describe('calendar links', () => {
  it('trip: all-day dates with an exclusive end', () => {
    const u = new URL(googleCalendarUrl('Onsen', { start: '2026-12-29', end: '2026-12-31' }, 'Asia/Tokyo', 'x'));
    expect(u.searchParams.get('dates')).toBe('20261229/20270101');
    expect(u.searchParams.get('text')).toBe('Onsen');
  });
  it('time: wall-clock times in the plan zone', () => {
    const u = new URL(googleCalendarUrl('Dinner', { start: '2026-10-30', end: '2026-10-30', startMin: 1140, endMin: 1440 }, 'Asia/Tokyo', ''));
    expect(u.searchParams.get('dates')).toBe('20261030T190000/20261031T000000');
    expect(u.searchParams.get('ctz')).toBe('Asia/Tokyo');
  });
  it('ics: UTC times and escaped text', () => {
    const ics = icsFile('abc', 'Dinner; with, friends', { start: '2026-10-30', end: '2026-10-30', startMin: 1140, endMin: 1260 }, 'Asia/Tokyo', 'https://x');
    expect(ics).toContain('DTSTART:20261030T100000Z');
    expect(ics).toContain('SUMMARY:Dinner\; with\\, friends');
  });
});
