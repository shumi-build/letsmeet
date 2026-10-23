import { DICT, type Lang } from './i18n';
import type { PollData } from './lib/api';
import type { Block, DayStatus, Member, TimeSpec, TripSpec } from './lib/scheduling';
import { addDays, localTimeZone, todayIn } from './lib/dates';
import { store } from './lib/store';

export type View = 'loading' | 'create' | 'share' | 'respond' | 'results' | 'decided' | 'notfound' | 'badlink' | 'error' | 'privacy';
export type Mode = 'trip' | 'time';

const tz = localTimeZone();
const today = todayIn(tz);
const nextWeekday = (from: string, wd: number) => { let k = addDays(from, 1); while (new Date(`${k}T00:00:00`).getDay() !== wd) k = addDays(k, 1); return k; };
const firstFri = nextWeekday(today, 5);

function initialLang(): Lang {
  const saved = store.lang();
  if (saved) return saved;
  return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export const S = {
  lang: initialLang(),
  view: 'loading' as View,

  // the "New plan" form
  create: {
    mode: 'trip' as Mode,
    title: { trip: '', time: '' } as Record<Mode, string>,
    cover: { trip: 0, time: 2 } as Record<Mode, number>, // mountains for trips, dinner for time plans
    tz,
    trip: { start: addDays(today, 14), end: addDays(today, 45), nights: 2 } as TripSpec,
    time: { days: [firstFri, addDays(firstFri, 1), addDays(firstFri, 7), addDays(firstFri, 8)], from: 1080, to: 1380 } as TimeSpec,
    cal: { trip: addDays(today, 14).slice(0, 7), time: today.slice(0, 7) } as Record<Mode, string>,
    rangePick: null as string | null,
    lastNights: 2,
    saving: false,
  },

  // an open plan
  id: '',
  key: '',
  poll: null as PollData | null,
  members: [] as Member[],
  admin: null as string | null,
  mine: null as { rid: string; secret: string } | null,
  draft: { trip: {} as Record<string, DayStatus>, time: new Set<string>() },
  myName: store.name(),
  myBusy: null as Record<string, Block[]> | null, // memory only; never stored or sent
  connected: false,
  paint: true,
  resNights: null as number | null,
  selWin: 0,
  showAll: false,
  saving: false,
};

export const T = () => DICT[S.lang];

let renderFn: () => void = () => {};
export const onRender = (fn: () => void) => { renderFn = fn; };
export const render = () => renderFn();
