import {assertEmulators} from './firebase-emulator.mjs';
import {runPilot} from '../cite/pilot.ts';
import {citeDemoCatalog,citeDemoPreferences} from './cite-demo-catalog.mjs';
export const citeCockpitDemo={uid:'cite-cockpit-operator',email:'cite-clem@example.test',password:'Fictitious-Cite-Only-42!',catalogDocument:'supplierCatalog/cite-cockpit-demo',date:'2027-03-01',tenants:['fiction-cite-cockpit-a','fiction-cite-cockpit-b']};
/** Explicit emulator fixture only. No equivalent provisioning endpoint is exposed. */
export async function seedCiteCockpitDemo(adapter,{reset=false}={}){
 assertEmulators();if(adapter.db.projectId!=='demo-rc-voyage'||process.env.K_SERVICE)throw Error('Emulator Cité fixture only');
 const d=citeCockpitDemo;try{const user=await adapter.auth.getUser(d.uid);if(user.email!==d.email||!user.emailVerified)throw Error('Fixture identity mismatch');}catch(e){if(e.code!=='auth/user-not-found')throw e;await adapter.auth.createUser({uid:d.uid,email:d.email,password:d.password,emailVerified:true});}
 const entries=[];
 for(const [i,tenantId]of d.tenants.entries()){
  const p=runPilot(i===0?'all':'participation'),seasonId=p.rewards.seasonId,scope={tenantId,seasonId,familyId:'family-0'};p.game.economy.config.tenantId=tenantId;p.game.economy.config.name=i===0?'La Cité des Ateliers':'La Cité du Verger';p.rewards.tenantId=tenantId;
  const ref=adapter.db.doc(`tenants/${tenantId}/citeSeasons/${seasonId}/privateEconomy/main`),member=adapter.db.doc(`tenants/${tenantId}/members/${d.uid}`);
  await adapter.db.runTransaction(async tx=>{const [r,m]=await Promise.all([tx.get(ref),tx.get(member)]);if(reset||!r.exists)tx.set(ref,{state:p.game.economy,councils:p.game.councils,city:p.game.city,rewards:p.rewards});if(reset||!m.exists)tx.set(member,{uid:d.uid,tenantId,active:true,citeRewardOperations:[seasonId]});});
  const names=['Camille','Sasha','Lou','Noa','Alex','Charlie'];
  for(const [j,[uid,pref]]of Object.entries(citeDemoPreferences()).entries()){
   const r=adapter.db.doc(`tenants/${tenantId}/giftPreferences/${uid}`),m=adapter.db.doc(`tenants/${tenantId}/members/${uid}`);await adapter.db.runTransaction(async tx=>{const [a,b]=await Promise.all([tx.get(r),tx.get(m)]);if(reset||!a.exists)tx.set(r,pref);if(reset||!b.exists)tx.set(m,{uid,tenantId,active:true,displayName:names[j],citeAssignments:[{seasonId,familyId:'family-'+Math.floor(j/2)}]});});
  }
  entries.push({id:'cite-'+i,space:'cite-gifts',...scope,label:p.game.economy.config.name});
 }
 const directory=adapter.db.doc('workspaceDirectories/'+d.uid),catalog=adapter.db.doc(d.catalogDocument),ledger=adapter.db.doc(d.catalogDocument+'/reservationLedger/main');
 await adapter.db.runTransaction(async tx=>{const [a,b]=await Promise.all([tx.get(directory),tx.get(catalog)]);if(reset||!a.exists)tx.set(directory,{uid:d.uid,active:true,entries});if(reset||!b.exists)tx.set(catalog,citeDemoCatalog());if(reset)tx.set(ledger,{counts:{},citeHeld:{}});});
}
