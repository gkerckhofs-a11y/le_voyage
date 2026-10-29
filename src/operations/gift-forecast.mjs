import {add,compare,divide,exact,mean,multiply,rounded,sum} from '../domain/exact.ts';
import {civilDate} from '../domain/calendar.ts';
// Versioned hypothesis, not a promise or a commercial probability.
export const forecastPolicy={version:'recent-active-v1',windowWeeks:4,minimumSamples:2,maximumAgeDays:28};
const zero=exact('0'),negativeOne=exact('-1');
const ceiling=q=>Number((BigInt(q.numerator)+BigInt(q.denominator)-1n)/BigInt(q.denominator));
export function forecastGift(state,teamId,asOf){
 civilDate(asOf);
 const team=state.config.teams.find(t=>t.id===teamId);if(!team)throw Error('Unknown team');
 const weeks=state.config.weeks.filter(w=>w.active&&team.eligibleWeekIds.includes(w.id));
 const outcomes=Object.values(state.outcomes).filter(o=>o.teamId===teamId);
 const distance=sum(outcomes.map(o=>o.km)),acquired=new Set(Object.values(state.entitlements).filter(e=>e.teamId===teamId).map(e=>e.milestoneId));
 const index=state.config.giftMilestones.findIndex(m=>!acquired.has(m.id)),milestone=state.config.giftMilestones[index];
 const byWeek=new Map(outcomes.map(o=>[o.weekId,o]));
 const remaining=weeks.filter(w=>!byWeek.has(w.id)).map(w=>({id:w.id,start:w.start,deadline:state.reports[JSON.stringify([teamId,w.id])]??w.endExclusive}));
 const base={teamId,asOf,distanceKm:rounded(distance),milestoneNumber:milestone?index+1:null,thresholdKm:milestone?.km??null,allocatedCents:milestone?.budgetCents??null,remainingKm:null,activeWeeksRemaining:remaining.length,sampleSize:0,meanKm:null,estimatedActiveWeeks:null,fastActiveWeeks:null,slowActiveWeeks:null,estimatedDate:null,status:'no-pending-milestone'};
 if(!milestone)return base;
 const gap=add(exact(String(milestone.km)),multiply(distance,negativeOne));base.remainingKm=compare(gap,zero)>0?ceiling(gap):0;
 // Never turn a projection into an entitlement, including inconsistent historical states.
 if(compare(gap,zero)<=0)return {...base,status:'awaiting-entitlement'};
 if(outcomes.some(o=>o.closedOn>asOf))return {...base,status:'future-data'};
 if(asOf>=state.config.weeks.at(-1).endExclusive)return {...base,status:'campaign-ended'};
 if(remaining.some(w=>w.deadline<asOf))return {...base,status:'pending-closure'};
 const recent=weeks.filter(w=>byWeek.has(w.id)).slice(-forecastPolicy.windowWeeks).map(w=>byWeek.get(w.id));
 base.sampleSize=recent.length;
 if(recent.length<forecastPolicy.minimumSamples)return {...base,status:'insufficient-history'};
 if(Date.parse(asOf)-Date.parse(recent.at(-1).closedOn)>forecastPolicy.maximumAgeDays*86400000)return {...base,status:'stale-history'};
 const speed=mean(recent.map(o=>o.km));base.meanKm=rounded(speed);
 if(compare(speed,zero)<=0)return {...base,status:'no-progress'};
 const speeds=recent.map(o=>o.km).sort(compare),estimate=ceiling(divide(gap,speed));
 base.estimatedActiveWeeks=estimate;base.fastActiveWeeks=ceiling(divide(gap,speeds.at(-1)));base.slowActiveWeeks=compare(speeds[0],zero)>0?ceiling(divide(gap,speeds[0])):null;
 if(estimate>remaining.length)return {...base,status:'beyond-calendar'};
 // Pauses/ineligible weeks add no progress. A report delays all subsequent closures.
 const date=remaining.slice(0,estimate).reduce((latest,w)=>w.deadline>latest?w.deadline:latest,asOf);
 if(date>state.config.weeks.at(-1).endExclusive)return {...base,status:'beyond-calendar'};
 return {...base,status:'estimated',estimatedDate:date};
}
