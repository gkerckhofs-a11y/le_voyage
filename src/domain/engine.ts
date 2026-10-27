import { add, compare, exact, mean, sum } from './exact.ts';
import type { Exact } from './exact.ts';
import { addDays, civilDate } from './calendar.ts';
import type { Week } from './calendar.ts';
import { normalizeWeights, scoreWeek } from './scoring.ts';
import type { PrivacyPolicy, WeeklyInput } from './scoring.ts';

export type Scope = Readonly<{ tenantId: string; campaignId: string }>;
export type Milestone = Readonly<{ id: string; km: number; budgetCents: number }>;
export type Team = Readonly<{ id: string; eligibleWeekIds: readonly string[] }>;
export type Config = Readonly<Scope & {
  version: string;
  weeks: readonly Week[];
  teams: readonly Team[];
  mode: 'autonomous' | 'kpi';
  weights: readonly string[];
  privacy: PrivacyPolicy;
  maxJokers: number;
  jokerKm: number;
  reportDays: number;
  giftMilestones: readonly Milestone[];
  reception: Readonly<{
    /** Date of last eligible processing day (Europe/Brussels), inclusive. Freeze runs the next day. */
    cutoffDate: string;
    baseBudgetCents: number;
    tiers: readonly Milestone[];
  }>;
}>;
export type Outcome = Readonly<{ teamId: string; weekId: string; km: Exact; source: 'scores' | 'floor' | 'joker' | 'closed'; closedOn: string }>;
export type Convoy = Readonly<{ weekId: string; km: Exact; closedOn: string }>;
export type Entitlement = Readonly<{ id: string; teamId: string; milestoneId: string; budgetCents: number; earnedOn: string }>;
export type Task = Readonly<{ id: string; entitlementId: string; status: 'to-select' }>;
export type Freeze = Readonly<{ level: number; budgetCents: number; km: Exact; frozenOn: string }>;
export type State = Readonly<{
  config: Config;
  outcomes: Readonly<Record<string, Outcome>>;
  convoys: Readonly<Record<string, Convoy>>;
  reports: Readonly<Record<string, string>>;
  entitlements: Readonly<Record<string, Entitlement>>;
  tasks: Readonly<Record<string, Task>>;
  freeze: Freeze | null;
}>;
export type Command = Scope & { teamId: string; weekId: string; today: string };
const key = (...parts: string[]): string => JSON.stringify(parts);
function unique(values: readonly string[]) { if (values.some(v => !v) || new Set(values).size !== values.length) throw new Error('Duplicate/empty identifier'); }
function integer(value: number, minimum = 0) { if (!Number.isSafeInteger(value) || value < minimum) throw new Error('Invalid integer'); }
function milestones(items: readonly Milestone[]) {
  unique(items.map(m => m.id));
  let previous = 0;
  for (const m of items) {
    integer(m.km, 1); integer(m.budgetCents);
    if (m.km <= previous) throw new Error('Milestones must increase');
    previous = m.km;
  }
}
export function createCampaign(config: Config): State {
  if (!config.tenantId || !config.campaignId || !config.version) throw new Error('Campaign identity/version required');
  normalizeWeights(config.weights);
  if (!['autonomous', 'kpi'].includes(config.mode)) throw new Error('Invalid campaign mode');
  integer(config.maxJokers); integer(config.reportDays, 1); integer(config.jokerKm, 40);
  if (config.jokerKm > 100 || config.reportDays > 31) throw new Error('Invalid exception policy');
  integer(config.privacy.minimumRespondents, 2);
  if (compare(exact(config.privacy.neutralScore), exact('1')) < 0 || compare(exact(config.privacy.neutralScore), exact('5')) > 0) throw new Error('Invalid neutral score');
  unique(config.weeks.map(w => w.id)); unique(config.teams.map(t => t.id));
  if (!config.weeks.length || !config.teams.length) throw new Error('Weeks and teams required');
  let previousEnd = '';
  for (const w of config.weeks) {
    civilDate(w.start); civilDate(w.endExclusive);
    if (addDays(w.start, 7) !== w.endExclusive || w.start < previousEnd) throw new Error('Invalid/overlapping weekly periods');
    previousEnd = w.endExclusive;
  }
  const weekIds = new Set(config.weeks.map(w => w.id));
  for (const t of config.teams) {
    unique(t.eligibleWeekIds);
    if (t.eligibleWeekIds.some(id => !weekIds.has(id))) throw new Error('Unknown eligible week');
  }
  if (config.weeks.some(w => w.active && !config.teams.some(t => t.eligibleWeekIds.includes(w.id)))) throw new Error('No eligible team for active week');
  milestones(config.giftMilestones); milestones(config.reception.tiers);
  civilDate(config.reception.cutoffDate); integer(config.reception.baseBudgetCents);
  let previousBudget = config.reception.baseBudgetCents;
  for (const tier of config.reception.tiers) {
    if (tier.budgetCents < previousBudget) throw new Error('Total reception budgets must not decrease');
    previousBudget = tier.budgetCents;
  }
  return { config: structuredClone(config), outcomes: {}, convoys: {}, reports: {}, entitlements: {}, tasks: {}, freeze: null };
}
function checkScope(state: State, scope: Scope) {
  if (state.config.tenantId !== scope.tenantId || state.config.campaignId !== scope.campaignId) throw new Error('Campaign scope mismatch');
}
function context(state: State, cmd: Command) {
  checkScope(state, cmd); civilDate(cmd.today);
  const week = state.config.weeks.find(w => w.id === cmd.weekId);
  const team = state.config.teams.find(t => t.id === cmd.teamId);
  if (!week || !team || !team.eligibleWeekIds.includes(week.id)) throw new Error('Unknown/ineligible team or week');
  return { week, team, id: key(cmd.teamId, cmd.weekId) };
}
function requireMonotonicDate(state: State, today: string) {
  if (Object.values(state.outcomes).some(o => o.closedOn > today) || (state.freeze && state.freeze.frozenOn > today))
    throw new Error('Cannot backdate a campaign event');
}
export function teamDistance(state: State, teamId: string): Exact {
  if (!state.config.teams.some(t => t.id === teamId)) throw new Error('Unknown team');
  return sum(Object.values(state.outcomes).filter(o => o.teamId === teamId).map(o => o.km));
}
export function convoyDistance(state: State): Exact { return sum(Object.values(state.convoys).map(o => o.km)); }
export function postponeWeek(state: State, cmd: Command): State {
  const { week, id } = context(state, cmd);
  if (!week.active || state.outcomes[id]) throw new Error('Week is closed');
  if (state.reports[id]) return state;
  requireMonotonicDate(state, cmd.today);
  if (cmd.today < week.start || cmd.today >= week.endExclusive) throw new Error('Report must be requested during the original week');
  return { ...state, reports: { ...state.reports, [id]: addDays(week.endExclusive, state.config.reportDays) } };
}
/** Pure transition; persistence MUST run it in an atomic per-campaign transaction. */
export function closeWeek(state: State, cmd: Command, decision: { kind: 'joker' } | { kind: 'evaluate'; input: WeeklyInput }): State {
  const { week, team, id } = context(state, cmd);
  if (state.outcomes[id]) return state;
  requireMonotonicDate(state, cmd.today);
  if (!['joker', 'evaluate'].includes(decision.kind)) throw new Error('Unknown close decision');
  const deadline = state.reports[id] ?? week.endExclusive;
  if (cmd.today < deadline) throw new Error('Response window remains open');
  // Chronological closure protects later totals, regularity snapshots and convoy history.
  if (state.config.weeks.some(w => w.start < week.start && w.active && team.eligibleWeekIds.includes(w.id) && !state.outcomes[key(team.id, w.id)]))
    throw new Error('Earlier active week still pending');
  let result: { km: Exact; source: Outcome['source'] };
  if (!week.active) result = { km: exact('0'), source: 'closed' };
  else if (decision.kind === 'joker') {
    const used = Object.values(state.outcomes).filter(o => o.teamId === team.id && o.source === 'joker').length;
    if (used >= state.config.maxJokers) throw new Error('Annual joker allowance exhausted');
    result = { km: exact(String(state.config.jokerKm)), source: 'joker' };
  } else {
    if (decision.input.mode !== state.config.mode) throw new Error('Campaign score mode mismatch');
    result = scoreWeek(decision.input, state.config.privacy, state.config.weights);
  }
  const outcome: Outcome = { teamId: team.id, weekId: week.id, ...result, closedOn: cmd.today };
  const outcomes = { ...state.outcomes, [id]: outcome };
  const next: State = { ...state, outcomes, convoys: { ...state.convoys }, entitlements: { ...state.entitlements }, tasks: { ...state.tasks } };
  const distance = teamDistance(next, team.id);
  const entitlements = { ...next.entitlements }, tasks = { ...next.tasks };
  for (const milestone of state.config.giftMilestones) {
    const entitlementId = key(cmd.tenantId, cmd.campaignId, team.id, milestone.id);
    if (!entitlements[entitlementId] && compare(distance, exact(String(milestone.km))) >= 0) {
      entitlements[entitlementId] = { id: entitlementId, teamId: team.id, milestoneId: milestone.id, budgetCents: milestone.budgetCents, earnedOn: cmd.today };
      const taskId = key('gift-task', entitlementId);
      tasks[taskId] = { id: taskId, entitlementId, status: 'to-select' };
    }
  }
  const convoys = { ...next.convoys };
  const activeTeams = state.config.teams.filter(t => t.eligibleWeekIds.includes(week.id));
  const teamOutcomes = activeTeams.map(t => outcomes[key(t.id, week.id)]);
  if (teamOutcomes.every(Boolean) && !convoys[week.id]) {
    convoys[week.id] = { weekId: week.id, km: week.active ? mean(teamOutcomes.map(o => o.km)) : exact('0'), closedOn: cmd.today };
  }
  return { ...next, entitlements, tasks, convoys };
}
export function receptionLevel(state: State): Freeze {
  if (state.freeze) return state.freeze;
  const eligible = Object.values(state.convoys).filter(c => c.closedOn <= state.config.reception.cutoffDate);
  const km = sum(eligible.map(c => c.km));
  const tiers = state.config.reception.tiers.filter(t => compare(km, exact(String(t.km))) >= 0);
  return { level: tiers.length, budgetCents: tiers.at(-1)?.budgetCents ?? state.config.reception.baseBudgetCents, km, frozenOn: '' };
}
export function freezeReception(state: State, scope: Scope, today: string): State {
  checkScope(state, scope); civilDate(today);
  if (state.freeze) return state;
  requireMonotonicDate(state, today);
  if (today <= state.config.reception.cutoffDate) throw new Error('Last eligible day has not ended');
  return { ...state, freeze: { ...receptionLevel(state), frozenOn: today } };
}
/** Restricted DTO: no responses, weights, scores, budgets, preferences or headcounts. */
export function publicProgress(state: State) {
  return {
    teams: state.config.teams.map(t => ({ id: t.id, km: teamDistance(state, t.id) })),
    convoyKm: convoyDistance(state),
    receptionLevel: receptionLevel(state).level,
    receptionFrozen: !!state.freeze,
  };
}
