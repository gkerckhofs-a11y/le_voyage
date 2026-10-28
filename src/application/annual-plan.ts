import {previewAnnualLogistics} from './annual-logistics.ts';
import type {AnnualLogistics} from './annual-logistics.ts';
import {previewAnnualAttentions} from './annual-attentions.ts';
import type {AnnualAttentions} from './annual-attentions.ts';
import {previewAnnualOrganisation,previewEnterpriseFunding} from './annual-organisation.ts';
import type {AnnualOrganisation} from './annual-organisation.ts';
import {previewAnnualQuestionnaire} from './annual-questionnaire.ts';
import type {AnnualQuestionnaire} from './annual-questionnaire.ts';
import {previewAnnualFunding} from './annual-funding.ts';
import type {AnnualFunding} from './annual-funding.ts';
import {planRollingYear} from '../domain/rolling-calendar.ts';
import type {RollingCalendar} from '../domain/rolling-calendar.ts';
import {activeWeeks,addDays,civilDate} from '../domain/calendar.ts';
import {thresholds} from '../domain/scoring.ts';
export type AnnualPlanInput=RollingCalendar & {freezeDate:string;receptionDate:string;giftCount:number;receptionTierCount:number;funding?:AnnualFunding;questionnaire?:AnnualQuestionnaire;organisation?:AnnualOrganisation;attentions?:AnnualAttentions;logistics?:AnnualLogistics};
/** Calendar draft only: never changes a running campaign or awards a gift. */
export function previewAnnualPlan(input:AnnualPlanInput){
 const keys=['start','evaluationWeekday','partialWeeks','leapDayAnniversary','timeZone','closedStarts','freezeDate','receptionDate','giftCount','receptionTierCount','funding','questionnaire','organisation','attentions','logistics'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))throw new Error('Invalid annual plan');
 if(input.closedStarts!==undefined&&(!Array.isArray(input.closedStarts)||input.closedStarts.length>60||input.closedStarts.some(s=>typeof s!=='string')))throw new Error('Invalid closures');
 const calendar=planRollingYear(input),freezeDate=civilDate(input.freezeDate),receptionDate=civilDate(input.receptionDate);
 if(freezeDate<=calendar.start||freezeDate>=calendar.endExclusive||receptionDate<=freezeDate||receptionDate>=calendar.endExclusive)throw new Error('Freeze and reception must be ordered inside campaign');
 const active=activeWeeks(calendar.weeks);if(!active)throw new Error('No active weeks');
 const beforeFreeze=activeWeeks(calendar.weeks,addDays(freezeDate,-1));
 const organisation=previewAnnualOrganisation(input.organisation),funding=previewAnnualFunding(input.funding,input.giftCount,input.receptionTierCount);
 const attentions=previewAnnualAttentions(input.attentions,calendar.start,calendar.endExclusive,organisation);
 if(funding&&attentions&&funding.basis!==attentions.basis)throw new Error('All annual envelopes require the same HT/TTC basis');
 return {logistics:previewAnnualLogistics(input.logistics,input.receptionTierCount),attentions,organisation,enterpriseFunding:previewEnterpriseFunding(organisation,funding,attentions),questionnaire:previewAnnualQuestionnaire(input.questionnaire),funding,schemaVersion:1 as const,...calendar,activeWeeks:active,maximumKm:active*100,weeksBeforeFreeze:beforeFreeze,receptionMaximumKm:beforeFreeze*100,
  giftThresholds:thresholds(active,input.giftCount,'gift'),receptionThresholds:thresholds(beforeFreeze,input.receptionTierCount,'reception'),freezeDate,receptionDate};
}
export type AnnualPlanPreview=ReturnType<typeof previewAnnualPlan>;
