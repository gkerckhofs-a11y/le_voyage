import {createEconomy,ECONOMY_VERSION} from '../../src/cite/economy.ts';
import {planWeeks} from '../../src/domain/calendar.ts';
export function config(count=2,sizes=Array(count).fill(2)){
 return {tenantId:'fiction-cite',seasonId:'prototype-2026',name:'La Cité des Ateliers — prototype',rulesVersion:ECONOMY_VERSION,missingDataPolicy:'defer',minimumValueResponses:1,metrics:{performance:[{id:'quality',label:'Qualité (note normalisée)',weightBps:10000}],values:[{id:'cooperation',label:'Entraide',weightBps:10000}]},families:Array.from({length:count},(_,i)=>({id:'family-'+i,name:'Famille '+(i+1)})),memberships:sizes.flatMap((n,i)=>Array.from({length:n},(_,j)=>({uid:`person-${i}-${j}`,familyId:'family-'+i,from:'2026-11-09'}))),weeks:planWeeks('2026-11-09',16)};
}
export const scope=(c,id='family-0')=>({tenantId:c.tenantId,seasonId:c.seasonId,familyId:id});
export const initial=()=>createEconomy(config());
