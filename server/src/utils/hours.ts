export const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export interface DaySchedule {
  open?: string; // "09:30"
  close?: string; // "21:00"
  isOpen?: boolean;
  breaks?: Array<{ start: string; end: string }>;
}

export interface BusinessHours {
  timezone?: string;
  schedule?: Partial<Record<DayKey, DaySchedule>>;
  specialHours?: Array<{ date: Date | string; open?: string; close?: string; isOpen?: boolean; reason?: string }>;
}

function toMinutes(hhmm?: string): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Current wall-clock time inside an IANA timezone, as {dayIndex, minutes, ymd}. */
function nowInZone(timezone: string, at: Date) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hour = Number(parts.hour === '24' ? '0' : parts.hour);
    return {
      dayIndex: weekdayMap[parts.weekday as string] ?? at.getDay(),
      minutes: hour * 60 + Number(parts.minute),
      ymd: `${parts.year}-${parts.month}-${parts.day}`,
    };
  } catch {
    return {
      dayIndex: at.getDay(),
      minutes: at.getHours() * 60 + at.getMinutes(),
      ymd: at.toISOString().slice(0, 10),
    };
  }
}

function withinWindow(open: number, close: number, minutes: number): boolean {
  // Windows that cross midnight (e.g. 18:00 → 02:00).
  if (close <= open) return minutes >= open || minutes < close;
  return minutes >= open && minutes < close;
}

export interface OpenState {
  isOpenNow: boolean;
  reason: 'open' | 'closed_today' | 'outside_hours' | 'on_break' | 'special_closed' | 'unknown';
  opensAt?: string;
  closesAt?: string;
}

/** Calendar date (YYYY-MM-DD) of an instant, as observed inside a timezone. */
function ymdInZone(date: Date, timezone: string): string | null {
  if (Number.isNaN(date.getTime())) return null;
  try {
    // en-CA formats as YYYY-MM-DD, which is already the shape we compare on.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Evaluates a shop's opening state in its own timezone, honouring breaks and
 * special/holiday hours. Used for the `openNow` filter and the detail page badge.
 */
export function getOpenState(hours: BusinessHours | undefined, at: Date = new Date()): OpenState {
  if (!hours?.schedule) return { isOpenNow: false, reason: 'unknown' };

  const timezone = hours.timezone || 'Asia/Kolkata';
  const { dayIndex, minutes, ymd } = nowInZone(timezone, at);

  const special = hours.specialHours?.find((s) => {
    const d = s.date instanceof Date ? s.date : new Date(s.date);
    // Compare in the shop's timezone. Reading the UTC date instead made a
    // holiday stored as local midnight resolve to the previous day (IST is
    // UTC+5:30), so overrides were silently ignored.
    return ymdInZone(d, timezone) === ymd;
  });

  const day: DaySchedule | undefined = special
    ? { open: special.open, close: special.close, isOpen: special.isOpen }
    : hours.schedule[DAY_KEYS[dayIndex]];

  if (!day || day.isOpen === false) {
    return { isOpenNow: false, reason: special ? 'special_closed' : 'closed_today' };
  }

  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  if (open === null || close === null) return { isOpenNow: false, reason: 'unknown' };

  if (!withinWindow(open, close, minutes)) {
    return { isOpenNow: false, reason: 'outside_hours', opensAt: day.open, closesAt: day.close };
  }

  const onBreak = (day.breaks ?? []).some((b) => {
    const start = toMinutes(b.start);
    const end = toMinutes(b.end);
    return start !== null && end !== null && withinWindow(start, end, minutes);
  });

  if (onBreak) return { isOpenNow: false, reason: 'on_break', opensAt: day.open, closesAt: day.close };

  return { isOpenNow: true, reason: 'open', opensAt: day.open, closesAt: day.close };
}

/** Convenience wrapper used by serializers. */
export function isOpenNow(hours: BusinessHours | undefined, at?: Date): boolean {
  return getOpenState(hours, at).isOpenNow;
}
