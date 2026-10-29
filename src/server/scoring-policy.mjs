import {rollingRegularity} from '../domain/scoring.ts';
const invalid=()=>Object.assign(new Error('Explicit scoring policy required'),{status:409});
export function collectionScoring(record){
 if(record.ledger.state.config.mode==='kpi')return {mode:'kpi',kpis:['5','5'],source:'fictitious'};
 const p=record.autonomousPolicy;
 if(record.ledger.state.config.mode!=='autonomous'||p?.kind!=='participation-mean'||p.includeCurrent!==true||!Number.isSafeInteger(p.windowWeeks)||p.windowWeeks<1||p.windowWeeks>60)throw invalid();
 return {mode:'autonomous',source:'fictitious',policy:{...p}};
}
export function scoringDescription(scoring){return scoring?.mode==='autonomous'?`Mode autonome fictif : participation et régularité sur les ${scoring.policy.windowWeeks} dernières semaines évaluées, semaine courante incluse. Absents exclus des présents ; jokers exclus de la régularité. Aucun KPI économique. Valeurs humaines neutralisées sous le seuil configuré.`:'Démonstration KPI : deux notes fictives à 5/5. Valeurs humaines neutralisées sous le seuil configuré.';}
export function autonomousEvaluation(record,survey,roster,responses){
 const policy=survey.scoring?.policy;
 // Validate the policy frozen when this questionnaire opened, never a browser-supplied value.
 collectionScoring({...record,autonomousPolicy:policy});
 const history=record.participationHistory?.[survey.teamId]??[],outcomes=Object.values(record.ledger.state.outcomes).filter(o=>o.teamId===survey.teamId&&['scores','floor'].includes(o.source));
 if(history.length!==outcomes.length||new Set(history.map(h=>h.weekId)).size!==history.length||history.some(h=>!outcomes.some(o=>o.weekId===h.weekId)))throw invalid();
 const current={weekId:survey.weekId,present:roster.filter(m=>m.eligible&&!m.absent).length,responded:responses.length};
 const next=[...history,current],regularityScore=rollingRegularity(next,policy.windowWeeks);
 return {input:{mode:'autonomous',roster,responses,regularityScore},history:{...(record.participationHistory??{}),[survey.teamId]:next}};
}
