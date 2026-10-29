import {startDemo} from './demo-client.js';
let csrf='',invitationId='',provisioned=false,busy=false;
const recipient=document.getElementById('recipient-uid') as HTMLInputElement;
function clearInvite(){invitationId='';(document.getElementById('invitation-url') as HTMLInputElement).value='';(document.getElementById('open-invitation') as HTMLAnchorElement).removeAttribute('href');document.getElementById('invitation-expiry')!.textContent='';document.getElementById('invitation-result')!.hidden=true;}
recipient.addEventListener('input',()=>{clearInvite();});
const status=document.getElementById('admin-status')!,create=document.getElementById('create-invitation') as HTMLButtonElement,revoke=document.getElementById('revoke-invitation') as HTMLButtonElement;
async function post(action:string,data:unknown){const r=await fetch('/api/invitation/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});if(!r.ok)throw new Error();return r.json();}
create.addEventListener('click',async()=>{if(busy)return;const recipientUid=recipient.value.trim();if(provisioned&&!/^[A-Za-z0-9_-]{1,128}$/.test(recipientUid)){status.textContent='Renseignez un identifiant de compte valide.';return;}busy=true;create.disabled=true;revoke.disabled=true;recipient.disabled=true;email.disabled=true;find.disabled=true;clearInvite();try{const invite=await post('create',provisioned?{recipientUid}:{});invitationId=invite.id;(document.getElementById('invitation-url') as HTMLInputElement).value=new URL(invite.url,location.origin).href;(document.getElementById('open-invitation') as HTMLAnchorElement).href=invite.url;document.getElementById('invitation-expiry')!.textContent='Valable jusqu’au '+new Intl.DateTimeFormat('fr-BE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Brussels'}).format(new Date(invite.expiresAt));document.getElementById('invitation-result')!.hidden=false;revoke.disabled=false;status.textContent='Invitation créée. Aucun e-mail envoyé.';}catch{clearInvite();status.textContent='Création non confirmée. Vérifiez le destinataire et votre permission d’invitation. Aucun message envoyé.';}finally{busy=false;create.disabled=false;recipient.disabled=false;email.disabled=false;find.disabled=false;}});
revoke.addEventListener('click',async()=>{if(busy||!invitationId)return;busy=true;revoke.disabled=true;create.disabled=true;recipient.disabled=true;email.disabled=true;find.disabled=true;try{await post('revoke',{id:invitationId});clearInvite();status.textContent='Invitation révoquée. Ce lien ne permet plus de rejoindre l’équipe.';}catch{status.textContent='Révocation non confirmée. Une invitation déjà acceptée ne peut plus être révoquée ici.';revoke.disabled=false;}finally{busy=false;create.disabled=false;recipient.disabled=false;email.disabled=false;find.disabled=false;}});

const send=document.getElementById('send-invitation') as HTMLButtonElement;
const email=document.getElementById('recipient-email') as HTMLInputElement,find=document.getElementById('find-recipient') as HTMLButtonElement,summary=document.getElementById('recipient-summary')!;
email.addEventListener('input',()=>{recipient.value='';summary.textContent='';clearInvite();});
recipient.addEventListener('input',()=>{summary.textContent='';});
find.addEventListener('click',async()=>{
 if(busy)return;const value=email.value.trim();if(!value||!email.checkValidity()){status.textContent='Renseignez une adresse e-mail valide.';return;}
 busy=true;find.disabled=true;create.disabled=true;revoke.disabled=true;email.disabled=true;recipient.disabled=true;recipient.value='';summary.textContent='';clearInvite();
 try{const account=await post('recipient',{email:value});recipient.value=account.uid;summary.textContent='Compte vérifié : '+account.email+' · '+account.uid;status.textContent='Vérifiez le destinataire, puis créez son invitation.';}
 catch{status.textContent='Compte introuvable, non vérifié, désactivé ou recherche refusée. Vérifiez l’adresse et vos permissions.';}
 finally{busy=false;find.disabled=false;create.disabled=false;email.disabled=false;recipient.disabled=false;}
});
send.addEventListener('click',async()=>{
 if(busy||!provisioned||send.hidden)return;
 const recipientUid=recipient.value.trim();
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(recipientUid)){status.textContent='Vérifiez le compte destinataire avant tout envoi.';return;}
 if(typeof crypto.randomUUID!=='function'){status.textContent='Connexion sécurisée nécessaire pour préparer cet envoi.';return;}
 const mutationId=crypto.randomUUID();
 busy=true;send.disabled=true;create.disabled=true;revoke.disabled=true;recipient.disabled=true;email.disabled=true;find.disabled=true;
 try{
  const result=await post('send',{recipientUid,mutationId});
  if(result.sent!==true)throw Error();
  clearInvite();
  status.textContent='Invitation transmise au destinataire. Aucun nouveau droit n’est créé tant qu’il ne l’a pas acceptée.';
 }catch{
  status.textContent='Envoi non confirmé. Vérifiez le suivi avant de créer une autre invitation : aucun renvoi automatique n’est effectué.';
 }finally{busy=false;send.disabled=false;create.disabled=false;recipient.disabled=false;email.disabled=false;find.disabled=false;}
});
create.disabled=true;void startDemo().then(async()=>{csrf=(await post('session',{})).csrf;const config=await fetch('/api/auth/config');if(!config.ok)throw Error();const settings=await config.json(),mode=settings.mode;if(!['demo','provisioned'].includes(mode))throw Error();provisioned=mode==='provisioned';send.hidden=!(provisioned&&settings.invitationEmailEnabled===true);if(provisioned){document.getElementById('real-recipient')!.hidden=false;document.getElementById('invitation-introduction')!.textContent='Préparez un lien personnel pour rejoindre l’équipe actuellement sélectionnée.';document.getElementById('invitation-link-label')!.textContent='Lien personnel du destinataire';document.getElementById('open-invitation')!.textContent='Ouvrir le lien du destinataire';create.textContent='Créer une invitation';document.getElementById('invitation-help')!.textContent='Lien personnel valable 24 heures, révocable avant acceptation. Aucun message envoyé. Le compte destinataire devra être connecté pour accepter.';}create.disabled=false;}).catch(()=>{status.textContent='Connexion administrative requise.';});
