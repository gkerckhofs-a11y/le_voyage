import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
const fail=status=>Object.assign(new Error('Preferences unavailable'),{status});
export const categories=['wine','beer','tea','chocolate','delicatessen'];
const empty=()=>({choices:[],alcoholFree:false,surprise:false,birthday:null,privateContactRequested:false});
export function normalizeGiftPreferences(input){
 if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['choices','alcoholFree','surprise','birthday','privateContactRequested','revision'].includes(k)))throw fail(400);
 const {choices,alcoholFree,surprise,birthday,privateContactRequested,revision}=input;
 if(!Number.isSafeInteger(revision)||revision<0||!Array.isArray(choices)||choices.length>3||new Set(choices).size!==choices.length||choices.some(c=>!categories.includes(c))||[alcoholFree,surprise,privateContactRequested].some(v=>typeof v!=='boolean'))throw fail(400);
 if((alcoholFree&&choices.some(c=>c==='wine'||c==='beer'))||(surprise&&choices.length))throw fail(400);
 if(birthday!==null){if(!birthday||typeof birthday!=='object'||Object.keys(birthday).sort().join(',')!=='day,month'||!Number.isInteger(birthday.day)||!Number.isInteger(birthday.month)||birthday.month<1||birthday.month>12||birthday.day<1||birthday.day>[31,29,31,30,31,30,31,31,30,31,30,31][birthday.month-1])throw fail(400);}
 return {choices:categories.filter(c=>choices.includes(c)),alcoholFree,surprise,birthday:birthday===null?null:{day:birthday.day,month:birthday.month},privateContactRequested};
}
export function createGiftPreferences(adapter,{now=()=>Date.now()}={}){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function operate(header,scope,fn){
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({tenantId,uid})=>(await db.doc(`tenants/${tenantId}/members/${uid}`).get()).data()});const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   const checked=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${viewer.viewerId}`))).data()});await checked('Bearer verified',scope);
   const ref=db.doc(`tenants/${scope.tenantId}/giftPreferences/${viewer.viewerId}`),snapshot=await tx.get(ref),record=snapshot.data()??{value:empty(),revision:0,updatedAt:null,history:[]};return fn(tx,ref,record);
  });
 }
 const view=r=>({...r.value,revision:r.revision,updatedAt:r.updatedAt});
 return {read:(h,s)=>operate(h,s,(_tx,_ref,r)=>view(r)),save:async(h,s,input)=>{const value=normalizeGiftPreferences(input);return operate(h,s,(tx,ref,r)=>{
  if(JSON.stringify(value)===JSON.stringify(r.value))return view(r);
  if(input.revision!==r.revision)throw fail(409);
  const updatedAt=now(),revision=r.revision+1,next={value,revision,updatedAt,history:[...r.history,{revision,at:updatedAt}].slice(-20)};tx.set(ref,next);return view(next);
 });}};
}
