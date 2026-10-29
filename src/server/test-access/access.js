/* global firebase */
const button=document.getElementById('google-login'),status=document.getElementById('access-status');
let auth,config;
const invitationKey='rc-test-invitation';
function pendingInvitation(){
 const input=location.hash.slice(1);
 if(input){
  if(!/^[a-f0-9]{64}$/.test(input))throw Error('Invitation invalide. Rouvrez le lien personnel reçu.');
  sessionStorage.setItem(invitationKey,input);
  history.replaceState(null,'','/test-access');
 }
 const stored=sessionStorage.getItem(invitationKey);
 if(stored&&!/^[a-f0-9]{64}$/.test(stored)){sessionStorage.removeItem(invitationKey);throw Error('Invitation invalide.');}
 return stored;
}
async function exchange(user){
 const invitationToken=pendingInvitation();
 let r;try{r=await fetch('/test-access/session',{method:'POST',headers:{'Content-Type':'application/json','X-Test-CSRF':config.csrf},body:JSON.stringify({idToken:await user.getIdToken(),...(invitationToken?{invitationToken}:{})})});}finally{await auth.signOut();}
 if(!r.ok)throw Error(r.status===403?'Ce compte Google ne peut pas utiliser cette invitation ou le serveur de test.':'La connexion n’a pas abouti. Vérifiez le compte destinataire, puis réessayez.');
 const result=await r.json();
 const destination=invitationToken?'/invitation.html#'+invitationToken:null;
 if(result.destination!==(destination??'/espaces.html')&&!(destination===null&&result.destination==='/connexion.html'))throw Error('Destination de connexion invalide.');
 sessionStorage.removeItem(invitationKey);location.replace(result.destination);
}
function problem(error){status.textContent=error?.code==='auth/popup-closed-by-user'?'Connexion annulée. Vous pouvez réessayer.':error?.code?'Google n’a pas pu terminer la connexion. Réessayez dans votre navigateur habituel.':error.message||'Connexion indisponible. Rechargez la page.';button.disabled=false;}
(async()=>{try{const r=await fetch('/test-access/config');if(!r.ok)throw Error('Connexion momentanément indisponible.');config=await r.json();pendingInvitation();if(location.origin!==config.canonical){location.replace(config.canonical+'/test-access');return;}firebase.initializeApp({apiKey:config.apiKey,authDomain:config.authDomain,projectId:config.projectId});auth=firebase.auth();await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);const result=await auth.getRedirectResult();if(result.user){await exchange(result.user);return;}status.textContent='Seuls les comptes autorisés peuvent entrer.';button.disabled=false;button.addEventListener('click',async()=>{button.disabled=true;status.textContent='Ouverture de Google…';const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{await auth.signInWithRedirect(provider);}catch(e){problem(e);}});}catch(e){problem(e);}})();
