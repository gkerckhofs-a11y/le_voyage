// New fictitious members only. These records do not establish historical eligibility.
export const beneficiaryDemo=[
 {profile:'bocage1',uid:'demo-bocage-sacha',displayName:'Sacha (fictif)',teamId:'private-collective-team-1',choices:['tea'],alcoholFree:true},
 {profile:'bocage2',uid:'demo-bocage-noa',displayName:'Noa (fictif)',teamId:'private-collective-team-2',choices:['chocolate'],alcoholFree:true},
 {uid:'demo-bocage-lou',displayName:'Lou (fictif)',teamId:'private-collective-team-1',choices:['chocolate'],alcoholFree:false},
 {uid:'demo-bocage-alex',displayName:'Alex (fictif)',teamId:'private-collective-team-2',choices:['tea'],alcoholFree:false}
];
export async function seedBeneficiaryDemo(db,campaignId){const tenantId='fiction-operations-demo';for(const p of beneficiaryDemo){const base=`tenants/${tenantId}`,member=db.doc(`${base}/members/${p.uid}`),profile=db.doc(`${base}/profiles/${p.uid}`),preferences=db.doc(`${base}/giftPreferences/${p.uid}`);await db.runTransaction(async tx=>{const m=await tx.get(member),n=await tx.get(profile),g=await tx.get(preferences);if(!m.exists)tx.create(member,{uid:p.uid,tenantId,active:true,assignments:[{campaignId,teamId:p.teamId}]});if(!n.exists)tx.create(profile,{displayName:p.displayName});if(!g.exists)tx.create(preferences,{revision:1,updatedAt:Date.now(),history:[],value:{choices:p.choices,alcoholFree:p.alcoholFree,surprise:false,birthday:null,privateContactRequested:false}});});}}
