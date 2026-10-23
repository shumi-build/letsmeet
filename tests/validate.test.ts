import { describe, expect, it } from 'vitest';
import { parseDecision, parseMeta } from '../worker/src/validate';

const today = '2026-10-22';
const trip = { v: 1, mode: 'trip', title: 'Trip', cover: 'snow', tz: 'Asia/Tokyo', trip: { start: '2026-11-14', end: '2026-12-31', nights: 2 } };
const time = { v: 1, mode: 'time', title: 'Dinner', cover: 'city', tz: 'Asia/Tokyo', time: { days: ['2026-10-31', '2026-10-30'], from: 1080, to: 1380 } };

describe('server input checks', () => {
  it('accepts valid plans', () => {
    expect(parseMeta(trip, today)?.trip?.nights).toBe(2);
    expect(parseMeta(time, today)?.time?.days).toEqual(['2026-10-30', '2026-10-31']);
  });
  it('rejects unknown covers, bad zones and odd times', () => {
    expect(parseMeta({ ...trip, cover: '<script>' }, today)).toBeNull();
    expect(parseMeta({ ...trip, tz: 'Mars/Base' }, today)).toBeNull();
    expect(parseMeta({ ...time, time: { ...time.time, from: 1085 } }, today)).toBeNull();
  });
  it('rejects ranges that are too long or impossible', () => {
    expect(parseMeta({ ...trip, trip: { start: '2026-11-14', end: '2027-06-01', nights: 2 } }, today)).toBeNull();
    expect(parseMeta({ ...trip, trip: { start: '2026-11-14', end: '2026-11-15', nights: 3 } }, today)).toBeNull();
  });
  it('strips control characters and angle brackets from the title', () => {
    expect(parseMeta({ ...trip, title: 'a\u0000b\nc' }, today)?.title).toBe('abc');
    expect(parseMeta({ ...trip, title: '<script>x</script>' }, today)?.title).toBe('scriptx/script');
  });
  it('only accepts decisions inside the plan', () => {
    const m = parseMeta(time, today)!;
    expect(parseDecision({ start: '2026-10-30', end: '2026-10-30', startMin: 1140, endMin: 1260 }, m)).not.toBeNull();
    expect(parseDecision({ start: '2026-11-02', end: '2026-11-02', startMin: 1140, endMin: 1260 }, m)).toBeNull();
    expect(parseDecision({ start: '2026-10-30', end: '2026-10-30', startMin: 600, endMin: 1260 }, m)).toBeNull();
  });
});
