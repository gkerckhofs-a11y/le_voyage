// Governance-only prototype: the crisis Council, secret ambitions and reward options come later.
import {createEconomy,ECONOMY_VERSION,submitValues,recordPerformance,closeFamilyWeek} from '../src/cite/economy.ts';
import {createGovernance,COUNCIL_RULES,openCouncil,castBallot,closeVote,pledge,closeFunding,councilPublicView} from '../src/cite/councils.ts';
import {planWeeks,addDays} from '../src/domain/calendar.ts';
export function simulateCouncils(){
 const weeks=planWeeks('2026-11-09',16),families=Array.from({length:3},(_,i)=>({id:'family-'+i,name:'Famille '+(i+1)}));
 const config={tenantId:'fiction-cite-councils',seasonId:'governance-pilot',name:'La Cité des Ateliers — prototype de gouvernance',rulesVersion:ECONOMY_VERSION,missingDataPolicy:'defer',minimumValueResponses:1,families,weeks,memberships:families.flatMap(f=>Array.from({length:2},(_,i)=>({uid:f.id+'-person-'+i,familyId:f.id,from:weeks[0].start}))),metrics:{performance:[{id:'quality',label:'Qualité normalisée',weightBps:10000}],values:[{id:'cooperation',label:'Entraide',weightBps:10000}]}};
 const scope={tenantId:config.tenantId,seasonId:config.seasonId,familyId:'family-0'};let game=createGovernance(createEconomy(config),{economy:20,wellbeing:20,culture:20,infrastructure:20,environment:20},COUNCIL_RULES);const checkpoints=[];
 for(const [i,w]of weeks.entries()){
  for(const f of families){const s={...scope,familyId:f.id};game.economy=recordPerformance(game.economy,s,w.id,{quality:'4'},w.start);for(const m of config.memberships.filter(m=>m.familyId===f.id))game.economy=submitValues(game.economy,s,m.uid,w.id,{cooperation:'4'},w.start);}
  if((i+1)%4===0){
   const n=(i+1)/4,project=(id,name,category,effects)=>({id,name,category,effects,narrative:name+' est construit.'});
   const projects=n===1?[project('library','Bibliothèque','small',{culture:12,economy:-3}),project('clinic','Dispensaire','small',{wellbeing:12,economy:-2})]:n===2?[project('reservoir','Réservoir','small',{environment:12,economy:1})]:n===3?[project('bridge','Pont','standard',{infrastructure:12}),project('market','Marché','small',{economy:12,environment:-4})]:[project('workshops','Ateliers','standard',{economy:12,environment:-5})];
   const d={id:'council-'+n,weekId:w.id,title:['Bibliothèque ou dispensaire ?','Construire un réservoir ?','Pont ou marché ?','Financer les ateliers ?'][n-1],mode:projects.length===2?'choice':'yes-no',projects,voteOpensOn:w.start,firstVoteClosesOn:addDays(w.start,1),secondVoteClosesOn:addDays(w.start,3),fundingClosesOn:addDays(w.start,6),failure:{narrative:'Le projet échoue ; la cité perd une occasion de se développer.',effects:{economy:-5,infrastructure:-3}}};
   game=openCouncil(game,scope,d,w.start);
   const vote=round=>{const c=game.councils.records[d.id];for(const [j,f]of families.entries())if(!c.suspended.includes(f.id)){const choice=n===3?projects[j%2].id:d.mode==='yes-no'?'yes':projects[0].id;for(const uid of c.roster[f.id])game=castBallot(game,{...scope,familyId:f.id},uid,d.id,round,choice,round===1?w.start:d.firstVoteClosesOn);}};
   vote(1);game=closeVote(game,scope,d.id,1,d.firstVoteClosesOn);
   if(game.councils.records[d.id].phase==='voting'){vote(2);game=closeVote(game,scope,d.id,2,d.secondVoteClosesOn);}
   if(game.councils.records[d.id].phase==='funding'){
    const amounts=n===1?[51,51,51]:n===2?[89,64,0]:[1,1,1];
    for(const [j,f]of families.entries())game=pledge(game,{...scope,familyId:f.id},f.id+'-person-0',d.id,amounts[j],0,`pledge-${n}-${j}`,d.firstVoteClosesOn);
    game=closeFunding(game,scope,d.id,d.fundingClosesOn);
   }
   checkpoints.push({week:i+1,council:councilPublicView(game,scope,d.id)});
  }
  for(const f of families)game.economy=closeFamilyWeek(game.economy,{...scope,familyId:f.id},w.id,w.endExclusive).state;
 }
 return {status:'governance-prototype-only',provisionalRules:COUNCIL_RULES,crisisCouncilImplemented:false,weeks:16,incomeCredits:game.economy.audit.length,incomeTotal:game.economy.audit.reduce((s,c)=>s+c.ecus,0),spentTotal:game.councils.spending.reduce((s,c)=>s+c.ecus,0),finalPurses:{...game.economy.balances},gauges:{...game.councils.gauges},checkpoints};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify(simulateCouncils(),null,2));
