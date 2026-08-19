// Time-of-day slots for itinerary places, plus .ics calendar export.
//
// `time_of_day` lives on each place inside itinerary_days.places (JSONB), so
// no schema migration is needed. New itineraries get slots from the model;
// older ones fall back to slotOf()'s inference so grouping and export still
// work everywhere.

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export const TIME_SLOTS: { id: TimeOfDay; label: string; startHour: number }[] = [
  { id: 'morning', label: 'Morning', startHour: 9 },
  { id: 'afternoon', label: 'Afternoon', startHour: 13 },
  { id: 'evening', label: 'Evening', startHour: 19 },
];

const SLOT_RANK: Record<TimeOfDay, number> = { morning: 0, afternoon: 1, evening: 2 };

interface SlottablePlace {
  time_of_day?: string;
  category?: string;
}

/**
 * Resolve a place's slot: explicit value wins; otherwise infer from category
 * (cafes are mornings, bars are evenings) and finally from position in the
 * day (first third morning, middle afternoon, last third evening).
 */
export function slotOf(place: SlottablePlace, index: number, dayCount: number): TimeOfDay {
  const t = place.time_of_day;
  if (t === 'morning' || t === 'afternoon' || t === 'evening') return t;
  if (place.category === 'cafe') return 'morning';
  if (place.category === 'bar') return 'evening';
  if (dayCount <= 1) return 'afternoon';
  const third = index / dayCount;
  if (third < 1 / 3) return 'morning';
  if (third < 2 / 3) return 'afternoon';
  return 'evening';
}

/** Stable sort by slot so proximity ordering survives within each slot. */
export function sortBySlot<T extends SlottablePlace>(places: T[]): T[] {
  const n = places.length;
  return places
    .map((p, i) => ({ p, i }))
    .sort((a, b) =>
      SLOT_RANK[slotOf(a.p, a.i, n)] - SLOT_RANK[slotOf(b.p, b.i, n)] || a.i - b.i
    )
    .map(x => x.p);
}

// -------------------- .ics export --------------------

interface IcsPlace extends SlottablePlace {
  name: string;
  description?: string;
  why?: string;
  address?: string;
  google_place_id?: string;
}

interface IcsDay {
  day_number: number;
  narrative?: string;
  places: IcsPlace[];
}

interface IcsItinerary {
  id?: string;
  title: string;
  destination?: string;
  days: IcsDay[];
}

// RFC 5545 TEXT escaping: backslash, semicolon, comma, newline.
const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Fold lines at 75 octets per RFC 5545 (approximate with chars; ASCII-heavy
// content makes this safe enough for every major calendar client).
const fold = (line: string): string => {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
};

const pad = (n: number) => String(n).padStart(2, '0');

// Floating local date-time (no TZ suffix) — travel events should land at the
// destination's wall-clock time, whatever timezone the phone is in.
const dt = (date: Date, hour: number, minute: number): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(hour)}${pad(minute)}00`;

const dateOnly = (date: Date): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

/**
 * Build a .ics calendar for the trip. `startDate` is the local date of Day 1
 * (a Date at midnight local). Each place becomes a 90-minute event inside its
 * time-of-day slot; each day also gets an all-day event carrying the
 * narrative so the trip reads well in month view.
 */
export function buildIcs(itinerary: IcsItinerary, startDate: Date): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pocket Compass//Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${esc(itinerary.title)}`),
  ];

  const stampDate = new Date();
  const dtstamp = `${dateOnly(stampDate)}T${pad(stampDate.getHours())}${pad(stampDate.getMinutes())}00`;
  const uidBase = itinerary.id || itinerary.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  itinerary.days.forEach(day => {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + (day.day_number - 1));
    const nextDate = new Date(dayDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // All-day banner with the day narrative
    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${uidBase}-day${day.day_number}@pocketcompass`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateOnly(dayDate)}`,
      `DTEND;VALUE=DATE:${dateOnly(nextDate)}`,
      fold(`SUMMARY:${esc(`${itinerary.title} — Day ${day.day_number}`)}`),
      ...(day.narrative ? [fold(`DESCRIPTION:${esc(day.narrative)}`)] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );

    // Timed events: sequential 90-minute blocks inside each slot
    const n = day.places.length;
    const slotCounters: Record<TimeOfDay, number> = { morning: 0, afternoon: 0, evening: 0 };
    day.places.forEach((place, i) => {
      const slot = slotOf(place, i, n);
      const slotMeta = TIME_SLOTS.find(s => s.id === slot)!;
      const offsetMin = slotCounters[slot] * 90;
      slotCounters[slot] += 1;

      const startHour = slotMeta.startHour + Math.floor(offsetMin / 60);
      const startMin = offsetMin % 60;
      const endTotal = startHour * 60 + startMin + 90;

      const descParts = [place.description, place.why].filter(Boolean) as string[];
      if (place.google_place_id) {
        descParts.push(`https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`);
      }

      lines.push(
        'BEGIN:VEVENT',
        fold(`UID:${uidBase}-d${day.day_number}-p${i}@pocketcompass`),
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dt(dayDate, startHour, startMin)}`,
        `DTEND:${dt(dayDate, Math.floor(endTotal / 60), endTotal % 60)}`,
        fold(`SUMMARY:${esc(place.name)}`),
        ...(place.address ? [fold(`LOCATION:${esc(place.address)}`)] : []),
        ...(descParts.length ? [fold(`DESCRIPTION:${esc(descParts.join('\n\n'))}`)] : []),
        'END:VEVENT',
      );
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
