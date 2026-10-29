export type Week = Readonly<{ id: string; start: string; endExclusive: string; active: boolean }>;
export function civilDate(value: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Expected YYYY-MM-DD civil date');
  const d = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(d.valueOf()) || d.toISOString().slice(0, 10) !== value) throw new Error('Invalid civil date');
  return value;
}
export function addDays(value: string, days: number): string {
  civilDate(value);
  if (!Number.isSafeInteger(days)) throw new Error('Integer calendar days required');
  const d = new Date(value + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Instant -> civil date only. Calendar arithmetic never uses 24-hour local intervals. */
export function brusselsDate(instant: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(instant)) throw new Error('Timezone-qualified instant required');
  const d = new Date(instant);
  if (!Number.isFinite(d.valueOf())) throw new Error('Invalid instant');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function planWeeks(startMonday: string, count: number, closedStarts: readonly string[] = []): Week[] {
  civilDate(startMonday);
  if (new Date(startMonday + 'T00:00:00Z').getUTCDay() !== 1) throw new Error('Campaign starts on Monday; partial weeks need explicit configuration');
  if (!Number.isSafeInteger(count) || count < 1 || count > 60) throw new Error('Invalid campaign week count');
  if (new Set(closedStarts).size !== closedStarts.length) throw new Error('Duplicate closure');
  const weeks = Array.from({ length: count }, (_, i) => {
    const start = addDays(startMonday, i * 7);
    return { id: start, start, endExclusive: addDays(start, 7), active: !closedStarts.includes(start) };
  });
  if (closedStarts.some(s => !weeks.some(w => w.start === s))) throw new Error('Closure outside campaign');
  return weeks;
}
/** Only complete active weeks whose ordinary closing date is no later than freeze. */
export function activeWeeks(weeks: readonly Week[], freezeDate?: string): number {
  if (freezeDate) civilDate(freezeDate);
  return weeks.filter(w => w.active && (!freezeDate || w.endExclusive <= freezeDate)).length;
}
