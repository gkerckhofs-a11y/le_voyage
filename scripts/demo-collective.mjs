// Build-time fiction only. No team membership, score input, budget or gift plan is served.
import { planWeeks, addDays } from '../src/domain/calendar.ts';
import { exact } from '../src/domain/exact.ts';
import { createCampaign, closeWeek, freezeReception } from '../src/domain/engine.ts';
import { DEFAULT_WEIGHTS, thresholds } from '../src/domain/scoring.ts';
import { collectiveJourneyView } from '../src/presentation/collective-view.ts';

export const collectiveScenarios = ['journey', 'before-freeze', 'frozen', 'tpe'];
export function collectiveState(scenario = 'journey') {
  if (!collectiveScenarios.includes(scenario)) throw new Error('Unknown scenario');
  const weeks = planWeeks('2026-01-05', 46), tpe = scenario === 'tpe';
  const scope = { tenantId: tpe ? 'fiction-atelier' : 'fiction-lex-ekho', campaignId: 'fiction-2026' };
  const sizes = tpe ? [2] : [6, 10, 7, 6];
  let state = createCampaign({ ...scope, version: 'demo-only-v3b', weeks,
    teams: sizes.map((_,i) => ({ id: i===0?'explorateurs':`private-collective-team-${i}`, eligibleWeekIds: weeks.map(w => w.id) })),
    mode: 'kpi', weights: DEFAULT_WEIGHTS, privacy: { minimumRespondents: 5, neutralScore: '3' },
    maxJokers: 2, jokerKm: 70, reportDays: 7,
    giftMilestones: thresholds(46,5,'gift').map((km,i) => ({id:`private-gift-${i}`,km,budgetCents:10000})),
    reception: { cutoffDate: weeks[41].endExclusive, baseBudgetCents:100000,
      tiers: thresholds(42,4,'reception').map((km,i) => ({id:`private-tier-${i}`,km,budgetCents:130000+i*30000})) }
  });
  const count = scenario === 'frozen' ? 46 : scenario === 'before-freeze' ? 42 : 24;
  for (const [i,week] of weeks.slice(0,count).entries()) {
    if (i === 42) state = freezeReception(state, scope, addDays(state.config.reception.cutoffDate,1));
    for (const [n,team] of state.config.teams.entries()) {
      // Rotating [55,70,70,85] preserves 70 km collective and the existing team's 24-week total.
      const score = tpe ? '3' : i < 24 ? ['2','3','3','4'][(i+n)%4] : '5';
      const roster = Array.from({length:sizes[n]},(_,p) => ({id:`private-person-${n}-${p}`,eligible:true,absent:false}));
      state = closeWeek(state,{...scope,teamId:team.id,weekId:week.id,today:week.endExclusive},{kind:'evaluate',input:{
        roster,responses:roster.map(p => ({participantId:p.id,answers:[score,score,score]})),mode:'kpi',kpis:[exact(score),exact(score)],
      }});
    }
  }
  return state;
}
export function collectiveIdentity(state) {
  const titles = ['Apéritif amélioré','Menu du terroir','Soirée festive','Grande célébration'];
  const descriptions = ['Une sélection apéritive plus généreuse.','Une table qui fait la part belle aux artisans.','Une animation pour prolonger les retrouvailles.','Une formule de fête encore enrichie.'];
  return { organizationName: state.config.tenantId === 'fiction-atelier' ? 'Atelier fictif' : 'Lex EKHO', receptionDate:'2026-11-27', baseTitle:'Réception conviviale',
    tiers:Object.fromEntries(state.config.reception.tiers.map((tier,i) => [tier.id,{title:titles[i],description:descriptions[i]}])) };
}
export function demoCollective(scenario = 'journey') {
  const state = collectiveState(scenario);
  return collectiveJourneyView(state,state.config,collectiveIdentity(state));
}
