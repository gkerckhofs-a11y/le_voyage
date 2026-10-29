import { addDays, civilDate } from './calendar.ts';
import type { Week } from './calendar.ts';

/** Contract choices must be explicit; neither partial-week credit nor leap-day policy is inferred. */
export type RollingCalendar = Readonly<{
  start: string;
  evaluationWeekday: number; // ISO weekday: Monday=1, Sunday=7; final day of an ordinary period.
  partialWeeks: 'exclude' | 'full-credit';
  leapDayAnniversary: 'february-28' | 'march-1';
  timeZone?: string;
  closedStarts?: readonly string[];
}>;
export type PlannedWeek = Week & Readonly<{ partial: boolean; evaluationDate: string }>;

export function campaignDate(instant: string, timeZone = 'Europe/Brussels'): string {
  if (typeof instant !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(instant)) throw new Error('Timezone-qualified instant required');
  const date = new Date(instant);
  if (!Number.isFinite(date.valueOf())) throw new Error('Invalid instant');
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function planRollingYear(input: RollingCalendar) {
  civilDate(input.start);
  if (!Number.isInteger(input.evaluationWeekday) || input.evaluationWeekday < 1 || input.evaluationWeekday > 7) throw new Error('ISO evaluation weekday required');
  if (!['exclude', 'full-credit'].includes(input.partialWeeks)) throw new Error('Explicit partial-week policy required');
  if (!['february-28', 'march-1'].includes(input.leapDayAnniversary)) throw new Error('Explicit leap-day policy required');
  const timeZone = input.timeZone ?? 'Europe/Brussels';
  campaignDate(input.start + 'T12:00:00Z', timeZone); // Validate the campaign timezone without using it for day arithmetic.
  const year = Number(input.start.slice(0, 4)) + 1;
  if (year > 9999) throw new Error('Unsupported campaign year');
  const suffix = input.start.slice(5) === '02-29' ? (input.leapDayAnniversary === 'february-28' ? '02-28' : '03-01') : input.start.slice(5);
  const endExclusive = civilDate(String(year).padStart(4, '0') + '-' + suffix);
  const closed = input.closedStarts ?? [];
  if (new Set(closed).size !== closed.length) throw new Error('Duplicate closure');
  const weeks: PlannedWeek[] = [];
  let start = input.start;
  while (start < endExclusive) {
    const weekday = new Date(start + 'T00:00:00Z').getUTCDay() || 7;
    const ordinaryEnd = addDays(start, (input.evaluationWeekday - weekday + 7) % 7 + 1);
    const end = ordinaryEnd < endExclusive ? ordinaryEnd : endExclusive;
    const partial = addDays(start, 7) !== end;
    weeks.push({ id: start, start, endExclusive: end, partial, evaluationDate: addDays(end, -1),
      active: !closed.includes(start) && (!partial || input.partialWeeks === 'full-credit') });
    start = end;
  }
  if (closed.some(day => !weeks.some(w => w.start === day))) throw new Error('Closure must identify an existing period start');
  return { start: input.start, endExclusive, timeZone, weeks };
}

/** Guards persisted engine configuration against a calendar/period mismatch. */
export function assertRollingWeeks(calendar: RollingCalendar, weeks: readonly Week[]): void {
  const expected = planRollingYear(calendar).weeks;
  if (expected.length !== weeks.length || expected.some((w, i) => {
    const actual = weeks[i];
    return w.id !== actual.id || w.start !== actual.start || w.endExclusive !== actual.endExclusive || w.active !== actual.active;
  })) throw new Error('Weekly periods must match the rolling calendar');
}
