import { convoyDistance, receptionLevel } from '../domain/engine.ts';
import type { Scope, State } from '../domain/engine.ts';
import { add, exact, displayKm } from '../domain/exact.ts';
import { activeWeeks, addDays, civilDate } from '../domain/calendar.ts';

export type ReceptionIdentity = Readonly<{
  organizationName: string;
  receptionDate: string;
  baseTitle: string;
  tiers: Readonly<Record<string, Readonly<{ title: string; description: string }>>>;
}>;
export type TierStatus = 'reached' | 'next' | 'unreached' | 'frozen';

/** Server-side allowlist. The caller must establish scope from a verified session; this is not authentication. */
export function collectiveJourneyView(state: State, access: Scope, identity: ReceptionIdentity) {
  if (access.tenantId !== state.config.tenantId || access.campaignId !== state.config.campaignId) throw new Error('Scope denied');
  civilDate(identity.receptionDate);
  const freezeDate = addDays(state.config.reception.cutoffDate, 1);
  if (identity.receptionDate <= freezeDate) throw new Error('Reception must follow freeze');
  const weeks = state.config.weeks.filter(w => w.active);
  if (!weeks.length) throw new Error('No active journey');
  let cumulative = exact('0');
  const history = weeks.flatMap((w, i) => {
    const convoy = state.convoys[w.id];
    if (!convoy) return [];
    cumulative = add(cumulative, convoy.km);
    return [{ week: i + 1, start: w.start, endExclusive: w.endExclusive, distance: { ...convoy.km }, cumulative: { ...cumulative }, displayKm: displayKm(convoy.km) }];
  });
  const reception = receptionLevel(state), frozen = state.freeze !== null;
  const tiers = state.config.reception.tiers.map((tier, i) => {
    const label = identity.tiers[tier.id];
    if (!label?.title.trim() || !label.description.trim()) throw new Error('Reception labels required');
    const level = i + 1;
    const status: TierStatus = frozen && level === reception.level ? 'frozen'
      : level <= reception.level ? 'reached'
      : !frozen && level === reception.level + 1 ? 'next' : 'unreached';
    return { level, km: tier.km, title: label.title, description: label.description, status, included: level <= reception.level };
  });
  const distance = convoyDistance(state);
  return {
    schemaVersion: 1 as const, routeId: 'wallonie-imaginaire-v1', organizationName: identity.organizationName,
    distance: { ...distance }, displayKm: displayKm(distance), maximumKm: weeks.length * 100,
    activeWeeks: weeks.length, completedWeeks: history.length, history,
    reception: {
      date: identity.receptionDate, baseTitle: identity.baseTitle,
      freezeDate, frozen, frozenOn: state.freeze?.frozenOn ?? null,
      level: reception.level, distance: { ...reception.km }, displayKm: displayKm(reception.km),
      maximumKm: activeWeeks(state.config.weeks, state.config.reception.cutoffDate) * 100,
      formulaTitle: tiers.find(t => t.level === reception.level)?.title ?? identity.baseTitle, tiers,
    },
  };
}
export type CollectiveJourneyView = ReturnType<typeof collectiveJourneyView>;
