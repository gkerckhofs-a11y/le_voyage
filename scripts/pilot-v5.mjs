import {pathToFileURL} from 'node:url';
import {simulate} from './simulate.mjs';
import {displayKm} from '../src/domain/exact.ts';
/** Diagnostic harness only: does not create a campaign or write any remote data. */
export function pilotV5(){
 const checkpoints=[];
 const result=simulate({start:'2027-03-01',giftScaleVersion:'v5-early-simulation-1',reportWeekIndex:6,onCheckpoint:({client,weekIndex,state})=>checkpoints.push({clientId:client.id,week:weekIndex+1,start:state.config.weeks[weekIndex].start,endExclusive:state.config.weeks[weekIndex].endExclusive,reports:Object.keys(state.reports).length,outcomes:Object.keys(state.outcomes).length,convoys:Object.keys(state.convoys).length,gifts:Object.keys(state.entitlements).length,tasks:Object.keys(state.tasks).length,frozen:!!state.freeze,frozenKm:state.freeze?displayKm(state.freeze.km):null,frozenLevel:state.freeze?.level??null})});
 return {schemaVersion:1,scenario:'v5-pilot-12-weeks-1',start:'2027-03-01',giftScaleVersion:'v5-early-simulation-1',scope:'Simulation du moteur uniquement ; parcours Auth/Firestore et interfaces vérifiés séparément. Aucune activation contractuelle, donnée réelle ou commande.',...result,checkpoints};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(pilotV5(),null,2));
