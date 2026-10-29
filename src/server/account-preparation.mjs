import {createHash} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
const fail=s=>Object.assign(Error('Account preparation refused'),{status:s});
/** Operator-only Auth preparation. No membership, password, automatic verification or email sending. */
export function createAccountPreparation(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 function plan(input){
  if(!input||Object.keys(input).sort().join(',')!=='email,reason,reference,uid'||typeof input.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input.uid)||typeof input.email!=='string'||input.email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)||typeof input.reference!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input.reference)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)throw fail(400);
  const value={projectId:db.projectId,uid:input.uid,email:input.email,reference:input.reference,reason:input.reason.trim()};
  return {plan:value,digest:createHash('sha256').update(JSON.stringify(value)).digest('hex')};
 }
 async function find(method,value){try{return await auth[method](value);}catch(error){if(error.code==='auth/user-not-found')return null;throw error;}}
 async function preview(input){const result=plan(input),[uid,email]=await Promise.all([find('getUser',input.uid),find('getUserByEmail',input.email)]);return {...result,canCreate:!uid&&!email,uidExists:!!uid,emailExists:!!email};}
 return {
  preview,
  async create(input,expectedDigest){
   const view=await preview(input);if(!view.canCreate||expectedDigest!==view.digest)throw fail(409);
   try{const user=await auth.createUser({uid:input.uid,email:input.email,emailVerified:false,disabled:false});return {uid:user.uid,email:user.email,status:'created-unverified'};}
   catch(error){if(['auth/uid-already-exists','auth/email-already-exists'].includes(error.code))throw fail(409);throw error;}
  },
  async links(input){
   plan(input);const user=await find('getUser',input.uid);if(!user||user.disabled||user.email!==input.email)throw fail(403);
   const passwordSetupUrl=await auth.generatePasswordResetLink(user.email),verificationUrl=user.emailVerified?null:await auth.generateEmailVerificationLink(user.email);
   return {uid:user.uid,email:user.email,passwordSetupUrl,verificationUrl,createdAt:new Date().toISOString()};
  }
 };
}
