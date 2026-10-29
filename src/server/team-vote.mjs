import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
const fail=status=>Object.assign(new Error('Vote unavailable'),{status});
const names=['Les Explorateurs','Les Roues libres','Les Virages heureux'];
const colors=[{id:'terracotta',label:'Terracotta',hex:'#bf4a32'},{id:'forest',label:'Sapin',hex:'#355e49'},{id:'river',label:'Rivière',hex:'#356d94'}];
export function createTeamVote(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 const ref=s=>db.doc(`tenants/${s.tenantId}/campaigns/${s.campaignId}/teamVotes/${s.teamId}`);
 async function operate(header,scope,fn){
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({tenantId,uid})=>(await db.doc(`tenants/${tenantId}/members/${uid}`).get()).data()});
  const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   let member;const check=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>member=(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${viewer.viewerId}`))).data()});await check('Bearer verified',scope);
   const campaign=await tx.get(db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`));if(!campaign.exists||!JSON.parse(campaign.data().payload).ledger.state.config.teams.some(t=>t.id===scope.teamId))throw fail(403);
   const r=ref(scope),snapshot=await tx.get(r),vote=snapshot.data()??{status:'open',names,colors,closure:'manual',maxCandidates:3,ballots:{}};
   return fn({tx,r,vote,uid:viewer.viewerId,canClose:member.canManageTeam===true});
  });
 }
 const leaders=(v,key,values)=>{const ballots=Object.values(v.ballots),counts=values.map(value=>({value,n:ballots.filter(b=>b[key]===value).length})),max=Math.max(...counts.map(x=>x.n));return counts.filter(x=>x.n===max).map(x=>x.value);};
 const view=(v,uid,canClose)=>({leaders:canClose?{names:leaders(v,'name',v.names),colors:leaders(v,'color',v.colors.map(c=>c.id))}:null,status:v.status,names:v.names,colors:v.colors,closure:v.closure,maxCandidates:v.maxCandidates,myBallot:v.ballots[uid]??null,canClose,result:v.result??null});
 return {
  read:(h,s)=>operate(h,s,({vote,uid,canClose})=>view(vote,uid,canClose)),
  cast:(h,s,ballot)=>operate(h,s,({tx,r,vote,uid,canClose})=>{
   if(!vote.names.includes(ballot.name)||!vote.colors.some(c=>c.id===ballot.color))throw fail(400);
   const old=vote.ballots[uid];if(old){if(old.name!==ballot.name||old.color!==ballot.color)throw fail(409);return view(vote,uid,canClose);}
   if(vote.status!=='open')throw fail(409);
   // Bounded emulator fixture; production elections need per-member documents.
   if(Object.keys(vote.ballots).length>=100)throw fail(409);
   vote.ballots[uid]={name:ballot.name,color:ballot.color};tx.set(r,vote);return view(vote,uid,canClose);
  }),
  close:(h,s,decision)=>operate(h,s,({tx,r,vote,uid,canClose})=>{
   if(!canClose)throw fail(403);if(vote.status==='closed')return view(vote,uid,canClose);
   const ballots=Object.values(vote.ballots);if(!ballots.length)throw fail(409);
   const winners=(key,options)=>{const counts=options.map(value=>({value,count:ballots.filter(b=>b[key]===value).length})),max=Math.max(...counts.map(x=>x.count));return counts.filter(x=>x.count===max).map(x=>x.value);};
   const topNames=winners('name',vote.names),topColors=winners('color',vote.colors.map(c=>c.id));
   const tied=topNames.length>1||topColors.length>1;
   if(tied&&(!topNames.includes(decision.name)||!topColors.includes(decision.color)||typeof decision.reason!=='string'||decision.reason.trim().length<5||decision.reason.length>500))throw fail(409);
   const name=tied?decision.name:topNames[0],color=vote.colors.find(c=>c.id===(tied?decision.color:topColors[0]));
   vote.status='closed';vote.result={teamName:name,color:color.hex,colorLabel:color.label};vote.arbitration={by:uid,reason:tied?decision.reason.trim():'Majorité simple',at:Date.now()};
   tx.set(r,vote);tx.set(db.doc(`tenants/${s.tenantId}/campaigns/${s.campaignId}/teamIdentities/${s.teamId}`),vote.result);return view(vote,uid,canClose);
  })
 };
}
