import { deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createAccessBoundary } from './access.mjs';
import { teamFeed, claimEvents } from '../application/events.ts';
import { collectiveJourneyView } from '../presentation/collective-view.ts';
import { collectiveIdentity } from '../../scripts/demo-collective.mjs';
import { advance, identity, demoTeamIdentity } from './demo-service.mjs';

/** Shared transaction adapter. The caller supplies an explicitly scoped Firebase app. */
export function createFirestoreAdapter(app){
  const auth=getAuth(app),db=getFirestore(app);
  const publicIdentity=(record,teamIdentity,teamId)=>({...identity,...demoTeamIdentity(teamId),...teamIdentity,organizationName:collectiveIdentity(record.ledger.state).organizationName});
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
      const result=operation(record,viewer,teamIdentity,snapshot.data().collectionMode);
      if(result.record!==record){
        const payload=JSON.stringify(result.record);
        if(Buffer.byteLength(payload)>800000)throw new Error('Campaign snapshot limit exceeded');
        tx.update(ref,{payload});
      }
      return result.value;
    });
  }
  return {auth,db,
    collective:(header,scope)=>operate(header,scope,(record)=>({record,value:collectiveJourneyView(record.ledger.state,scope,collectiveIdentity(record.ledger.state))})),
    read:(header,scope)=>operate(header,scope,(record,viewer,teamIdentity)=>({record,value:teamFeed(record.ledger,viewer,publicIdentity(record,teamIdentity,viewer.teamId))})),
    claim:(header,scope,ids)=>operate(header,scope,(record,viewer,teamIdentity)=>{
      const result=claimEvents(record.ledger,viewer,ids),next={...record,ledger:result.ledger};
      return {record:next,value:{events:result.events,feed:teamFeed(next.ledger,viewer,publicIdentity(next,teamIdentity,viewer.teamId))}};
    }),
    // Test-only synthetic closure. No equivalent production endpoint is exposed.
    simulate:(header,scope,revision)=>operate(header,scope,(record,viewer,teamIdentity,collectionMode)=>{
      if(collectionMode==='weekly-questionnaire')throw Object.assign(new Error('Synthetic closure disabled for questionnaire collection'),{status:409});
      const result=advance(record,revision);return {record:result.record,value:{applied:result.applied,feed:teamFeed(result.record.ledger,viewer,publicIdentity(result.record,teamIdentity,viewer.teamId))}};
    }),
    close:async()=>{await db.terminate();await deleteApp(app);}
  };
}
