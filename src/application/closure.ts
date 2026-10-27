import { createHash } from 'node:crypto';
import { teamDistance } from '../domain/engine.ts';
import type { State, Scope } from '../domain/engine.ts';

/** Server-only final snapshot. Completion requires every eligible active week to be settled.
 * An elapsed calendar date alone never discards pending responses or postponed weeks. */
export function completedTeamJourney(state:State,scope:Scope,teamId:string){
  if(scope.tenantId!==state.config.tenantId||scope.campaignId!==state.config.campaignId)throw new Error('Scope denied');
  const team=state.config.teams.find(t=>t.id===teamId);
  if(!team)throw new Error('Team denied');
  const weeks=state.config.weeks.filter(w=>w.active&&team.eligibleWeekIds.includes(w.id));
  if(!weeks.length)return null;
  const outcomes=weeks.map(w=>state.outcomes[JSON.stringify([teamId,w.id])]);
  if(outcomes.some(o=>!o))return null;
  const earned=new Set(Object.values(state.entitlements).filter(e=>e.teamId===teamId).map(e=>e.milestoneId));
  const date=outcomes.map(o=>o.closedOn).sort().at(-1)!;
  return {
    id:createHash('sha256').update(JSON.stringify([scope.tenantId,scope.campaignId,'closure',teamId])).digest('hex'),
    kind:'closure' as const,teamId,date,distance:{...teamDistance(state,teamId)},maximumKm:weeks.length*100,
    // Only actually granted milestones; no estimated or unearned rewards.
    acquiredThresholds:state.config.giftMilestones.filter(m=>earned.has(m.id)).map(m=>m.km),
  };
}
export type Closure = NonNullable<ReturnType<typeof completedTeamJourney>>;
