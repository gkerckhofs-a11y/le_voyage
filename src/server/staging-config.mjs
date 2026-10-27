import {timingSafeEqual} from 'node:crypto';
export const stagingProjectId='rc-voyage-test-20261027';
export function stagingConfig(env=process.env){
 if(env.GOOGLE_CLOUD_PROJECT!==stagingProjectId||env.GCLOUD_PROJECT!==stagingProjectId||env.RC_STAGE!=='isolated-test'||env.FIRESTORE_EMULATOR_HOST||env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Explicit isolated test project required');
 const origins=(env.RC_ALLOWED_ORIGINS??'').split(',');
 if(!origins.length||origins.some(o=>{try{const u=new URL(o);return u.origin!==o||u.protocol!=='https:'||!(u.hostname===stagingProjectId+'.web.app'||u.hostname===stagingProjectId+'.firebaseapp.com'||/^voyage-test-[a-z0-9-]+\.a\.run\.app$/.test(u.hostname)||u.hostname==='voyage-test-632904531433.europe-west1.run.app');}catch{return true;}}))throw Error('Invalid test origins');
 for(const key of ['RC_TEST_ACCESS_PASSWORD','RC_TEST_AUTH_PASSWORD'])if(typeof env[key]!=='string'||env[key].length<32)throw Error('Test secrets required');
 if(!/^[A-Za-z0-9_-]{20,100}$/.test(env.RC_FIREBASE_API_KEY??''))throw Error('Firebase test API key required');
 return {projectId:stagingProjectId,origins,accessPassword:env.RC_TEST_ACCESS_PASSWORD,authPassword:env.RC_TEST_AUTH_PASSWORD,apiKey:env.RC_FIREBASE_API_KEY};
}
export function testGate(password){
 const expected=Buffer.from('voyage:'+password);
 return (req,res)=>{
  const value=req.headers.authorization;let supplied;
  if(typeof value==='string'&&value.startsWith('Basic ')&&value.length<1024) supplied=Buffer.from(value.slice(6),'base64');
  if(!supplied||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){
   res.writeHead(401,{'WWW-Authenticate':'Basic realm="Le Voyage - Tests prives", charset="UTF-8"','Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex, nofollow'});res.end('Accès réservé aux testeurs.');return false;
  }
  res.setHeader('X-Robots-Tag','noindex, nofollow');return true;
 };
}
