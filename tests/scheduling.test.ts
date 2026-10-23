import { describe, expect, it } from 'vitest';
import {
  busyByDay, dayStatus, decodeTime, decodeTrip, encodeTime, encodeTrip, timeBest, timeFromBusy, tripFromBusy, tripWindows, type Member,
} from '../app/src/lib/scheduling';
import { zonedToUtc } from '../app/src/lib/dates';

const TZ = 'Asia/Tokyo';
const mem = (id: string, extra: Partial<Member>): Member => ({ id, name: id, src: 'manual', hue: '#000', ...extra });

describe('dayStatus', () => {
  it('free day is ○', () => expect(dayStatus([])).toBe('o'));
  it('short plan is △', () => expect(dayStatus([{ s: 780, e: 900 }])).toBe('m'));
  it('a work day is ×', () => expect(dayStatus([{ s: 570, e: 1110 }])).toBe('x'));
  it('all-day event is ×', () => expect(dayStatus([{ s: 0, e: 1440, allDay: true }])).toBe('x'));
  it('evening-only plan is △', () => expect(dayStatus([{ s: 1140, e: 1320 }])).toBe('m'));
});

describe('busyByDay (time zones)', () => {
  it('splits an overnight event across two days in the plan zone', () => {
    const start = zonedToUtc('2026-11-21', 22 * 60, TZ), end = zonedToUtc('2026-11-22', 2 * 60, TZ);
    const b = busyByDay([{ start, end }], ['2026-11-21', '2026-11-22', '2026-11-23'], TZ);
    expect(b['2026-11-21']).toEqual([{ s: 1320, e: 1440, allDay: false }]);
    expect(b['2026-11-22']).toEqual([{ s: 0, e: 120, allDay: false }]);
    expect(b['2026-11-23']).toEqual([]);
  });
  it('marks a whole-day block as all day', () => {
    const b = busyByDay([{ start: zonedToUtc('2026-12-05', 0, TZ), end: zonedToUtc('2026-12-06', 0, TZ) }], ['2026-12-05'], TZ);
    expect(b['2026-12-05'][0].allDay).toBe(true);
    expect(tripFromBusy({ start: '2026-12-05', end: '2026-12-05', nights: 0 }, b)['2026-12-05']).toBe('x');
  });
});

describe('encodings round-trip', () => {
  it('trip', () => {
    const spec = { start: '2026-11-20', end: '2026-11-24', nights: 2 };
    const m = { '2026-11-20': 'o', '2026-11-21': 'm', '2026-11-22': 'x', '2026-11-23': 'o', '2026-11-24': 'o' } as const;
    expect(encodeTrip(spec, m)).toBe('omxoo');
    expect(decodeTrip(spec, 'omxoo')).toEqual(m);
  });
  it('time, including a start time on a 10-minute step', () => {
    const spec = { days: ['2026-10-31', '2026-10-30'], from: 1090, to: 1260 };
    const set = new Set(['2026-10-30|1090', '2026-10-31|1210']);
    expect(decodeTime(spec, encodeTime(spec, set))).toEqual(set);
  });
});

describe('tripWindows', () => {
  const spec = { start: '2026-11-20', end: '2026-11-25', nights: 2 };
  const a = mem('a', { trip: decodeTrip(spec, 'oooooo') });
  const b = mem('b', { trip: decodeTrip(spec, 'xooomo') });
  const c = mem('c', { trip: decodeTrip(spec, 'xooo' + 'xx') });
  it('puts the stretch where everyone is free first', () => {
    const w = tripWindows(spec, [a, b, c], 2);
    expect(w[0]).toMatchObject({ s: '2026-11-21', e: '2026-11-23', ok: 3 });
  });
  it('never returns overlapping options', () => {
    const w = tripWindows(spec, [a, b, c], 1);
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) expect(w[i].e < w[j].s || w[j].e < w[i].s).toBe(true);
  });
});

describe('timeBest', () => {
  it('finds the longest stretch where everyone overlaps', () => {
    const spec = { days: ['2026-10-30'], from: 1080, to: 1380 }; // 18:00–23:00
    const busyA = { '2026-10-30': [{ s: 1080, e: 1140 }] };      // busy 18–19
    const busyB = { '2026-10-30': [{ s: 1320, e: 1380 }] };      // busy 22–23
    const a = mem('a', { time: timeFromBusy(spec, busyA) }), b = mem('b', { time: timeFromBusy(spec, busyB) });
    const best = timeBest(spec, [a, b]);
    expect(best[0]).toMatchObject({ k: '2026-10-30', s: 1140, e: 1320 });
    expect(best[0].who.length).toBe(2);
  });
});
