import { add, bounded, compare, divide, exact, mean, multiply, rounded, sum } from './exact.ts';
import type { Exact } from './exact.ts';
export const DEFAULT_WEIGHTS = ['25', '25', '16.67', '16.67', '16.66'] as const;
export type Triple = readonly [string, string, string];
export type Five = readonly [Exact, Exact, Exact, Exact, Exact];
export function normalizeWeights(weights: readonly string[]): Exact[] {
  if (weights.length !== 5) throw new Error('Exactly five weights required');
  const values = weights.map(w => bounded(exact(w), '0', '1000000'));
  const total = sum(values);
  if (compare(total, exact('0')) <= 0) throw new Error('Positive total weight required');
  return values.map(w => divide(w, total));
}
export function weeklyKm(scores: readonly Exact[], weights: readonly string[] = DEFAULT_WEIGHTS): Exact {
  if (scores.length !== 5) throw new Error('Exactly five scores required');
  scores.forEach(s => bounded(s, '1', '5'));
  const normalized = normalizeWeights(weights);
  return add(exact('25'), multiply(exact('15'), sum(scores.map((s, i) => multiply(s, normalized[i])))));
}
export function rateScore(numerator: number, denominator: number): Exact {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || numerator < 0 || denominator <= 0 || numerator > denominator)
    throw new Error('Invalid rate; zero eligible members needs an explicit policy');
  return add(exact('1'), multiply(exact('4'), divide(exact(String(numerator)), exact(String(denominator)))));
}
/** Optional pilot rule: arithmetic mean of eligible weekly participation scores.
 * The caller supplies active weeks only, with absences already excluded.
 * This policy is a simulation hypothesis, not an approved product default.
 */
export function rollingRegularity(history: readonly { responded: number; present: number }[], windowWeeks: number): Exact {
  if (!Number.isSafeInteger(windowWeeks) || windowWeeks < 1 || windowWeeks > 60) throw new Error('Invalid regularity window');
  if (!history.length) throw new Error('No eligible history for regularity');
  return mean(history.slice(-windowWeeks).map(w => rateScore(w.responded, w.present)));
}
export function kpiScore(actual: string, target: string, direction: 'higher' | 'lower'): Exact {
  if (direction !== 'higher') throw new Error('Inverse KPI scale requires a configured and validated rule');
  const a = bounded(exact(actual), '0', '99999999999999999999');
  const t = exact(target);
  if (compare(t, exact('0')) <= 0) throw new Error('KPI target must be positive');
  const rate = compare(a, t) >= 0 ? exact('1') : divide(a, t);
  return add(exact('1'), multiply(exact('4'), rate));
}
export type RosterMember = Readonly<{ id: string; eligible: boolean; absent: boolean }>;
export type PrivateResponse = Readonly<{ participantId: string; answers: Triple }>;
export type PrivacyPolicy = Readonly<{ minimumRespondents: number; neutralScore: string }>;
/** Server-internal only. Never return the input or aggregate scores to hierarchy/kiosk. */
export function humanScores(roster: readonly RosterMember[], responses: readonly PrivateResponse[], policy: PrivacyPolicy) {
  if (!Number.isSafeInteger(policy.minimumRespondents) || policy.minimumRespondents < 2) throw new Error('Invalid privacy threshold');
  const neutral = bounded(exact(policy.neutralScore), '1', '5');
  const ids = new Set(roster.map(m => m.id));
  if (ids.size !== roster.length || roster.some(m => !m.id)) throw new Error('Duplicate/empty roster member');
  const present = new Set(roster.filter(m => m.eligible && !m.absent).map(m => m.id));
  const seen = new Set<string>();
  for (const response of responses) {
    if (!present.has(response.participantId)) throw new Error('Response from an absent/ineligible member');
    if (seen.has(response.participantId)) throw new Error('Duplicate response');
    seen.add(response.participantId);
    if (response.answers.length !== 3) throw new Error('Three answers required');
    response.answers.forEach(s => bounded(exact(s), '1', '5'));
  }
  const suppressed = responses.length < policy.minimumRespondents;
  const scores = suppressed ? [neutral, neutral, neutral] : [0, 1, 2].map(i => mean(responses.map(r => exact(r.answers[i]))));
  return { scores: scores as [Exact, Exact, Exact], suppressed, present: present.size, responded: responses.length };
}
export type WeeklyInput = Readonly<{
  roster: readonly RosterMember[];
  responses: readonly PrivateResponse[];
  mode: 'autonomous' | 'kpi';
  /** Required configured regularity result, not inferred from an unspecified formula. */
  regularityScore?: Exact;
  kpis?: readonly [Exact, Exact];
}>;
export function scoreWeek(input: WeeklyInput, privacy: PrivacyPolicy, weights: readonly string[]) {
  normalizeWeights(weights);
  if (!['autonomous', 'kpi'].includes(input.mode)) throw new Error('Unknown score mode');
  const humans = humanScores(input.roster, input.responses, privacy);
  if (!humans.present) throw new Error('All members absent: campaign policy must be decided');
  if (!humans.responded) return { km: exact('40'), source: 'floor' as const };
  let first: readonly [Exact, Exact];
  if (input.mode === 'autonomous') {
    if (!input.regularityScore) throw new Error('Configured regularity score required');
    first = [rateScore(humans.responded, humans.present), input.regularityScore];
  } else {
    if (!input.kpis) throw new Error('KPI pending: no silent fallback is configured');
    first = input.kpis;
  }
  return { km: weeklyKm([...first, ...humans.scores], weights), source: 'scores' as const };
}
export function thresholds(activeWeeks: number, count: number, kind: 'gift' | 'reception'): number[] {
  if (!Number.isSafeInteger(activeWeeks) || activeWeeks < 0 || activeWeeks > 60 || !Number.isSafeInteger(count) || count < 0 || count > 100)
    throw new Error('Invalid weeks or milestone count');
  if (!['gift', 'reception'].includes(kind)) throw new Error('Unknown milestone kind');
  if (!count) return [];
  if (!activeWeeks) throw new Error('No active weeks for milestones');
  const [start, span] = kind === 'gift' ? ['0.52', '0.36'] : ['0.58', '0.34'];
  const values = Array.from({ length: count }, (_, i) => {
    const factor = count === 1 ? exact('0.5') : divide(exact(String(i)), exact(String(count - 1)));
    const proportion = add(exact(start), multiply(exact(span), factor));
    return Number(rounded(multiply(exact(String(activeWeeks * 10)), proportion))) * 10;
  });
  if (new Set(values).size !== values.length || values[0] <= 0) throw new Error('Rounded thresholds collide: adjust milestone count');
  return values;
}
