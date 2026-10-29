// Build-time fixture only. This module and its campaign configuration are NEVER served.
import { planWeeks } from '../src/domain/calendar.ts';
import { exact } from '../src/domain/exact.ts';
import { createCampaign, closeWeek } from '../src/domain/engine.ts';
import { DEFAULT_WEIGHTS, thresholds } from '../src/domain/scoring.ts';
import { teamJourneyView } from '../src/presentation/journey-view.ts';
export function demoJourney() {
  const weeks = planWeeks('2026-01-05', 46);
  const scope = { tenantId: 'fiction-lex-ekho', campaignId: 'fiction-2026' };
  let state = createCampaign({ ...scope, version: 'demo-only-v3', weeks,
    teams: ['explorateurs','autre-equipe-privee'].map(id => ({ id, eligibleWeekIds: weeks.map(w => w.id) })),
    mode: 'kpi', weights: DEFAULT_WEIGHTS, privacy: { minimumRespondents: 5, neutralScore: '3' },
    maxJokers: 2, jokerKm: 70, reportDays: 7,
    giftMilestones: thresholds(46, 5, 'gift').map((km,i) => ({id:`private-gift-${i}`,km,budgetCents:10000})),
    reception: { cutoffDate: weeks[41].endExclusive, baseBudgetCents:100000,
      tiers: thresholds(42,4,'reception').map((km,i)=>({id:`private-tier-${i}`,km,budgetCents:130000+i*30000})) }
  });
  for (const [i,w] of weeks.slice(0,24).entries()) {
    const score = ['2','3','3','4'][i % 4];
    const roster = Array.from({length:6},(_,n)=>({id:`private-person-${n}`,eligible:true,absent:false}));
    state=closeWeek(state,{...scope,teamId:'explorateurs',weekId:w.id,today:w.endExclusive},{kind:'evaluate',input:{
      roster,responses:roster.map(p=>({participantId:p.id,answers:[score,score,score]})),mode:'kpi',kpis:[exact(score),exact(score)]
    }});
  }
  return teamJourneyView(state,{...scope,teamId:'explorateurs'},{organizationName:'Lex EKHO',teamName:'Les Explorateurs',color:'#bf4a32'});
}
