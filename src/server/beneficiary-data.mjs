import {createHash} from 'node:crypto';
export async function beneficiaryPreferences(tx,db,scope,id){
 const ref=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}/giftBeneficiaries/${id}`),snapshot=await tx.get(ref);if(!snapshot.exists)return null;const record=snapshot.data(),people=[];
 for(const person of record.people){const p=(await tx.get(db.doc(`tenants/${scope.tenantId}/giftPreferences/${person.uid}`))).data(),v=p?.value;people.push({uid:person.uid,displayName:person.displayName,choices:v?.choices??[],alcoholFree:v?.alcoholFree??false,surprise:v?.surprise??false,privateContactRequested:v?.privateContactRequested??false,hasPreferences:!!p,preferenceRevision:p?.revision??0});}
 const digest=createHash('sha256').update(JSON.stringify(people)).digest('hex');return {ref,record,people,digest,reviewCurrent:record.review?.digest===digest,contactRequired:people.some(p=>p.privateContactRequested)};
}
export function preferencesReady(data){return !data||(data.reviewCurrent&&(!data.contactRequired||data.record.review?.contactConfirmed===true));}
export function preferredCategories(people){
 const order=['tea','chocolate','grocery'],counts=new Map(order.map(k=>[k,0]));let specified=false;
 for(const p of people)for(const c of p.choices){specified=true;const key=c==='delicatessen'?'grocery':c;if(counts.has(key))counts.set(key,counts.get(key)+1);}
 const ranked=order.filter(k=>counts.get(k)>0).sort((a,b)=>counts.get(b)-counts.get(a)||order.indexOf(a)-order.indexOf(b));
 return ranked.length?ranked:specified?[]:order;
}
