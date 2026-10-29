/* global Firebase compat SDK loaded only on the opt-in private staging page. */
declare const firebase: any;
const status=document.getElementById('email-status')!;
const requestForm=document.getElementById('email-request') as HTMLFormElement;
const completeForm=document.getElementById('email-complete') as HTMLFormElement;
const requestEmail=document.getElementById('email-request-address') as HTMLInputElement;
const completeEmail=document.getElementById('email-complete-address') as HTMLInputElement;
const emailKey='rc-pilot-email-link-address';
const invitationKey='rc-pilot-email-link-invitation';
const maxInvitationAge=45*60*1000;
let auth:any=null;
const validEmail=(value:string)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)&&value.length<=254;
function pendingInvitation():string|null{
 try{
  const raw=localStorage.getItem(invitationKey);
  if(!raw)return null;
  const value=JSON.parse(raw);
  if(typeof value?.token!=='string'||!/^[a-f0-9]{64}$/.test(value.token)||typeof value.at!=='number'||Date.now()-value.at>maxInvitationAge||value.at>Date.now()+60000){
   localStorage.removeItem(invitationKey);return null;
  }
  return value.token;
 }catch{localStorage.removeItem(invitationKey);return null;}
}
function setBusy(form:HTMLFormElement,busy:boolean){const button=form.querySelector<HTMLButtonElement>('button[type="submit"]');if(button)button.disabled=busy;}
async function exchangeVerifiedIdentity(user:any){
 const idToken=await user.getIdToken();
 const invitationToken=pendingInvitation();
 const response=await fetch('/api/auth/identity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken,...(invitationToken?{invitationToken}:{})})});
 if(!response.ok)throw Error('Votre adresse est vérifiée, mais aucun accès ne correspond à ce compte ou à votre invitation. Rouvrez l’invitation nominative, puis réessayez.');
 const result=await response.json();
 const expected=invitationToken?'/invitation.html':'/espaces.html';
 if(result.destination!==expected)throw Error('La destination de connexion est invalide.');
 localStorage.removeItem(invitationKey);
 localStorage.removeItem(emailKey);
 history.replaceState(null,'','/email-link.html');
 location.replace(invitationToken?'/invitation.html#'+invitationToken:'/espaces.html');
}
requestForm.addEventListener('submit',async e=>{
 e.preventDefault();if(!auth)return;
 const email=requestEmail.value.trim().toLowerCase();if(!validEmail(email)){status.textContent='Saisissez une adresse e-mail valide.';return;}
 setBusy(requestForm,true);status.textContent='Envoi de la demande de connexion…';
 try{
  await auth.sendSignInLinkToEmail(email,{url:location.origin+'/email-link.html',handleCodeInApp:true});
  localStorage.setItem(emailKey,email);
  status.textContent='Si l’envoi est autorisé, consultez votre messagerie et ouvrez le lien reçu. Vérifiez également les courriers indésirables.';
 }catch{
  status.textContent='Le lien n’a pas pu être envoyé. Vérifiez que la connexion par e-mail est activée sur cet environnement de test.';
 }finally{setBusy(requestForm,false);}
});
completeForm.addEventListener('submit',async e=>{
 e.preventDefault();if(!auth)return;
 const email=completeEmail.value.trim().toLowerCase();if(!validEmail(email)){status.textContent='Confirmez l’adresse ayant reçu le lien.';return;}
 if(!auth.isSignInWithEmailLink(location.href)){status.textContent='Le lien est invalide ou incomplet. Demandez un nouveau lien.';return;}
 setBusy(completeForm,true);status.textContent='Vérification de votre identité…';
 try{
  const credential=await auth.signInWithEmailLink(email,location.href);
  try{await exchangeVerifiedIdentity(credential.user);}
  finally{await auth.signOut();}
 }catch(error){
  status.textContent=error instanceof Error&&!/^Firebase:/.test(error.message)?error.message:'Connexion impossible : vérifiez l’adresse destinataire ou demandez un nouveau lien.';
  setBusy(completeForm,false);
 }
});
void(async()=>{
 try{
  const response=await fetch('/api/auth/email-link/config',{cache:'no-store'});if(!response.ok)throw Error();
  const config=await response.json();
  if(typeof config.projectId!=='string'||typeof config.apiKey!=='string'||typeof config.authDomain!=='string'||config.canonical!==location.origin)throw Error();
  if(typeof firebase==='undefined')throw Error();
  firebase.initializeApp({apiKey:config.apiKey,authDomain:config.authDomain,projectId:config.projectId});
  auth=firebase.auth();auth.languageCode='fr';
  await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
  if(auth.isSignInWithEmailLink(location.href)){
   completeForm.hidden=false;
   completeEmail.value=localStorage.getItem(emailKey)||'';
   status.textContent='Confirmez l’adresse destinataire pour terminer la connexion.';
  }else{
   requestForm.hidden=false;
   status.textContent='Nous vous enverrons un lien de connexion personnel.';
  }
 }catch{status.textContent='La connexion par lien e-mail n’est pas activée sur cet environnement.';}
})();
