import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { createAccessBoundary } from './access.mjs';
import { teamFeed, claimEvents } from '../application/events.ts';
import { collectiveJourneyView } from '../presentation/collective-view.ts';
import { collectiveIdentity } from '../../scripts/demo-collective.mjs';
import { advance, identity } from './demo-service.mjs';

export const projectId='demo-rc-voyage';
export function assertEmulators(env=process.env){
  if(env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||env.GCLOUD_PROJECT!==projectId||env.NODE_ENV==='production')throw new Error('Isolated local emulators required');
}
/** Emulator-only integration. No fallback to credentials or production services. */
export function createFirebaseEmulatorAdapter(){
  assertEmulators();
  const app=initializeApp({projectId},'rc-test-'+randomUUID()),auth=getAuth(app),db=getFirestore(app);
  const publicIdentity=(record,teamIdentity)=>({...identity,...teamIdentity,organizationName:collectiveIdentity(record.ledger.state).organizationName});
  const membershipRef=({tenantId,uid})=>db.doc(`tenants/${tenantId}/members/${uid}`);
  const authorize=createAccessBoundary({verifyIdToken:(token,revoked)=>auth.verifyIdToken(token,revoked),readMembership:async scope=>(await membershipRef(scope).get()).data()});
  async function operate(header,scope,operation){
    const viewer=await authorize(header,scope);
    return db.runTransaction(async tx=>{
      // Recheck membership in the same transaction as state: a concurrent withdrawal causes a retry.
      const memberRef=membershipRef({tenantId:viewer.tenantId,uid:viewer.viewerId});
      const checked=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>(await tx.get(memberRef)).data()});
      await checked('Bearer internal-verified-identity',scope);
      const ref=db.doc(`tenants/${viewer.tenantId}/campaigns/${viewer.campaignId}`),snapshot=await tx.get(ref);
      if(!snapshot.exists)throw Object.assign(new Error('Access denied'),{status:403});
      const record=JSON.parse(snapshot.data().payload);
      if(record.ledger.state.config.tenantId!==viewer.tenantId||record.ledger.state.config.campaignId!==viewer.campaignId)throw Object.assign(new Error('Access denied'),{status:403});
      const teamIdentity=(await tx.get(db.doc(`tenants/${viewer.tenantId}/campaigns/${viewer.campaignId}/teamIdentities/${viewer.teamId}`))).data();
      const result=operation(record,viewer,teamIdentity);
      if(result.record!==record){
        const payload=JSON.stringify(result.record);
        if(Buffer.byteLength(payload)>800000)throw new Error('Campaign snapshot limit exceeded');
        tx.set(ref,{payload});
      }
      return result.value;
    });
  }
  return {auth,db,
    collective:(header,scope)=>operate(header,scope,(record)=>({record,value:collectiveJourneyView(record.ledger.state,scope,collectiveIdentity(record.ledger.state))})),
    read:(header,scope)=>operate(header,scope,(record,viewer,teamIdentity)=>({record,value:teamFeed(record.ledger,viewer,publicIdentity(record,teamIdentity))})),
    claim:(header,scope,ids)=>operate(header,scope,(record,viewer,teamIdentity)=>{
      const result=claimEvents(record.ledger,viewer,ids),next={...record,ledger:result.ledger};
      return {record:next,value:{events:result.events,feed:teamFeed(next.ledger,viewer,publicIdentity(next,teamIdentity))}};
    }),
    // Test-only synthetic closure. No equivalent production endpoint is exposed.
    simulate:(header,scope,revision)=>operate(header,scope,(record,viewer,teamIdentity)=>{
      const result=advance(record,revision);return {record:result.record,value:{applied:result.applied,feed:teamFeed(result.record.ledger,viewer,publicIdentity(result.record,teamIdentity))}};
    }),
    close:async()=>{await db.terminate();await deleteApp(app);}
  };
}
