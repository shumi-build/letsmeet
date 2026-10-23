// "Add to calendar" without any write permission: a Google Calendar template link and an .ics file.
// The person adds the event to their own calendar themselves.
import { addDays, pad, zonedToUtc } from './dates';
import type { Decision } from './api';

const compact = (k: string) => k.replace(/-/g, '');
const wall = (k: string, min: number) => {
  if (min >= 1440) return `${compact(addDays(k, 1))}T000000`;
  return `${compact(k)}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
};
const utcStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function googleCalendarUrl(title: string, d: Decision, tz: string, details: string): string {
  const dates = d.startMin === undefined
    ? `${compact(d.start)}/${compact(addDays(d.end, 1))}`
    : `${wall(d.start, d.startMin)}/${wall(d.end, d.endMin ?? 1440)}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates, details, ctz: tz });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function icsFile(uid: string, title: string, d: Decision, tz: string, url: string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lets Meet//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${uid}@letsmeet`, `DTSTAMP:${utcStamp(Date.now())}`];
  if (d.startMin === undefined) {
    lines.push(`DTSTART;VALUE=DATE:${compact(d.start)}`, `DTEND;VALUE=DATE:${compact(addDays(d.end, 1))}`);
  } else {
    lines.push(`DTSTART:${utcStamp(zonedToUtc(d.start, d.startMin, tz))}`, `DTEND:${utcStamp(zonedToUtc(d.end, d.endMin ?? 1440, tz))}`);
  }
  lines.push(`SUMMARY:${icsText(title)}`, `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

