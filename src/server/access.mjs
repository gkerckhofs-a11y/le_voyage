/** Server boundary. Inject Firebase Admin verifyIdToken and a trusted membership reader.
 * This module never trusts tenant/team/role claims supplied by the browser.
 */
const denied=()=>Object.assign(new Error('Access denied'),{status:403});
const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
export function createAccessBoundary({verifyIdToken,readMembership}){
  if(typeof verifyIdToken!=='function'||typeof readMembership!=='function')throw new TypeError('Trusted dependencies required');
  return async function authorize(authorization,{tenantId,campaignId,teamId}){
    if(![tenantId,campaignId,teamId].every(identifier))throw denied();
    if(typeof authorization!=='string'||!/^Bearer [^\s]{1,8192}$/.test(authorization))throw denied();
    let token;
    try{token=await verifyIdToken(authorization.slice(7),true);}catch{throw denied();}
    if(!identifier(token?.uid))throw denied();
    // Lookup is indexed by verified UID and requested tenant, never a client-supplied UID.
    const member=await readMembership({tenantId,uid:token.uid});
    if(!member||member.active!==true||member.tenantId!==tenantId||member.uid!==token.uid||
       !Array.isArray(member.assignments)||!member.assignments.some(a=>a.campaignId===campaignId&&a.teamId===teamId))throw denied();
    // Explicit projection: do not copy private membership metadata or token claims.
    return Object.freeze({tenantId,campaignId,teamId,viewerId:token.uid});
  };
}
