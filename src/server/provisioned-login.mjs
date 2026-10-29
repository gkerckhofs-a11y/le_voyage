const fail=status=>Object.assign(new Error('Authentication refused'),{status});
/** Exchanges an already authenticated identity; never provisions users or grants. */
export async function verifyProvisionedIdentity({auth,idToken,now=Date.now()}){
 if(typeof idToken!=='string'||!/^\S{1,8192}$/.test(idToken))throw fail(400);
 let claims;try{claims=await auth.verifyIdToken(idToken,true);}catch{throw fail(401);}
 const seconds=now/1000;
 if(typeof claims?.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(claims.uid)||claims.email_verified!==true||!['google.com','password'].includes(claims.firebase?.sign_in_provider)||
    !Number.isFinite(claims.auth_time)||claims.auth_time>seconds+60||seconds-claims.auth_time>300||
    !Number.isFinite(claims.exp)||claims.exp<=seconds)throw fail(401);
 return claims;
}
export async function provisionedLogin({auth,workspaces,idToken,now=Date.now()}){
 const claims=await verifyProvisionedIdentity({auth,idToken,now});
 const header='Bearer '+idToken;
 const entries=await workspaces.list(header);
 if(!entries.length)throw fail(403);
 return {header,scope:null,workspaceEnabled:true,directorOnly:false,organizerOnly:false,
  expires:Math.min(now+3300000,claims.exp*1000)};
}
