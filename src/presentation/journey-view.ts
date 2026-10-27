import { teamDistance } from '../domain/engine.ts';
import type { Scope, State } from '../domain/engine.ts';
import { add, exact, displayKm } from '../domain/exact.ts';

/** Server-side projection, NOT authentication. Scope must come from a verified session/membership. */
export function teamJourneyView(state: State, access: Scope & { teamId: string }, identity: { organizationName: string; teamName: string; color: string }) {
  if (access.tenantId !== state.config.tenantId || access.campaignId !== state.config.campaignId) throw new Error('Scope denied');
  const team = state.config.teams.find(t => t.id === access.teamId);
  if (!team) throw new Error('Team denied');
  if (!/^#[a-fA-F0-9]{6}$/.test(identity.color)) throw new Error('Invalid vehicle color');
  const weeks = state.config.weeks.filter(w => w.active && team.eligibleWeekIds.includes(w.id));
  if (!weeks.length) throw new Error('No active journey');
  let total = exact('0');
  const history = weeks.flatMap((w, i) => {
    const o = Object.values(state.outcomes).find(o => o.teamId === team.id && o.weekId === w.id);
    if (!o) return [];
    total = add(total, o.km);
    return [{ week: i + 1, start: w.start, endExclusive: w.endExclusive, distance: { ...o.km }, cumulative: { ...total }, displayKm: displayKm(o.km) }];
  });
  const distance = teamDistance(state, team.id);
  let next = false;
  // Allowlist only: internal IDs and all logistical fields stay server-side.
  const stages = state.config.giftMilestones.map((m, index) => {
    const acquired = Object.values(state.entitlements).some(e => e.teamId === team.id && e.milestoneId === m.id);
    const status = acquired ? 'unlocked' : next ? 'upcoming' : 'next';
    if (!acquired) next = true;
    const delta = BigInt(m.km) * BigInt(distance.denominator) - BigInt(distance.numerator);
    const remainingKm = delta <= 0n ? 0 : Number((delta + BigInt(distance.denominator) - 1n) / BigInt(distance.denominator));
    return { id: `route-${index + 1}`, thresholdKm: m.km, remainingKm, status,
      label: acquired ? 'Cadeau débloqué' : 'Cadeau mystère à débloquer' };
  });
  return {
    timeZone: state.config.calendar?.timeZone ?? 'Europe/Brussels',
    schemaVersion: 1 as const, routeId: 'wallonie-imaginaire-v1',
    organizationName: identity.organizationName, team: { id: team.id, name: identity.teamName, color: identity.color },
    distance: { ...teamDistance(state, team.id) }, displayKm: displayKm(teamDistance(state, team.id)),
    maximumKm: weeks.length * 100, activeWeeks: weeks.length, completedWeeks: history.length, history, stages,
  };
}
export type TeamJourneyView = ReturnType<typeof teamJourneyView>;
