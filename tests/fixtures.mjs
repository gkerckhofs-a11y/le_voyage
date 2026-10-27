import { planWeeks } from '../src/domain/calendar.ts';
import { exact } from '../src/domain/exact.ts';
import { DEFAULT_WEIGHTS } from '../src/domain/scoring.ts';
export const scope = { tenantId: 'demo-lex-ekho', campaignId: 'demo-2027' };
export function config(overrides = {}) {
  const weeks = overrides.weeks ?? planWeeks('2027-01-04', 4);
  return {
    ...scope, version: 'v2-proposal-1', weeks,
    teams: [{ id: 'cometes', eligibleWeekIds: weeks.map(w => w.id) }],
    mode: 'autonomous', weights: DEFAULT_WEIGHTS,
    privacy: { minimumRespondents: 5, neutralScore: '3' },
    maxJokers: 2, jokerKm: 70, reportDays: 7,
    giftMilestones: [{ id: 'gift-1', km: 70, budgetCents: 10000 }],
    reception: { cutoffDate: '2027-01-18', baseBudgetCents: 100000,
      tiers: [{ id: 'reception-1', km: 70, budgetCents: 130000 }, { id: 'reception-2', km: 140, budgetCents: 160000 }] },
    ...overrides,
  };
}
export function input({ size = 5, absent = [], score = '3', responded, mode = 'autonomous' } = {}) {
  const roster = Array.from({ length: size }, (_, i) => ({ id: `p${i}`, eligible: true, absent: absent.includes(i) }));
  const responses = roster.filter(m => !m.absent).slice(0, responded ?? size).map(m => ({ participantId: m.id, answers: [score, score, score] }));
  return { roster, responses, mode, regularityScore: exact(score), kpis: mode === 'kpi' ? [exact(score), exact(score)] : undefined };
}
export const cmd = (week, teamId = 'cometes', today = week.endExclusive) => ({ ...scope, teamId, weekId: week.id, today });
