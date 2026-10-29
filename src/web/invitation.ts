const token=location.hash.slice(1),status=document.getElementById('invitation-status')!,login=document.getElementById('recipient-login') as HTMLButtonElement,form=document.getElementById('accept-form') as HTMLFormElement;
let csrf='',hasGiftPreferences=false,provisioned=false,googleTestGate=false;
const accountForm=document.getElementById('invitation-login') as HTMLFormElement;
const tastes=document.getElementById('signup-preferences')!,surprise=document.getElementById('signup-surprise') as HTMLInputElement,alcoholFree=document.getElementById('signup-alcohol-free') as HTMLInputElement;
const choices=[...document.querySelectorAll<HTMLInputElement>('[name="signup-choice"]')];
function restrict(){status.textContent='';for(const input of choices){input.disabled=surprise.checked||(alcoholFree.checked&&['wine','beer'].includes(input.value));if(input.disabled)input.checked=false;}}
surprise.addEventListener('change',restrict);alcoholFree.addEventListener('change',restrict);
async function post(path:string,data:unknown){const r=await fetch('/api/invitation/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});if(!r.ok)throw new Error('Unavailable');return r.json();}
async function load(){
 form.hidden=true;
 if(!/^[a-f0-9]{64}$/.test(token)){status.textContent='Ce lien est incomplet. Rouvrez le lien reçu.';login.hidden=true;accountForm.hidden=true;document.getElementById('journey-link')!.hidden=false;return;}
 try{csrf=(await post('session',{})).csrf;const invitation=await post('preview',{token});document.getElementById('invitation-context')!.textContent=`${invitation.organizationName} · ${invitation.teamName}`;login.hidden=true;accountForm.hidden=true;hasGiftPreferences=invitation.hasGiftPreferences===true;tastes.hidden=hasGiftPreferences;document.getElementById('existing-preferences')!.hidden=!hasGiftPreferences;
 if(invitation.status==='accepted'){status.textContent='Vous avez déjà rejoint cette équipe.';document.getElementById('journey-link')!.hidden=false;}else{form.hidden=false;status.textContent='Votre invitation est prête. Choisissez votre nom affiché.';}}
 catch{status.textContent='Connectez-vous avec le compte destinataire. Un lien expiré, révoqué ou destiné à une autre personne ne peut pas être utilisé.';login.hidden=provisioned;accountForm.hidden=!provisioned||googleTestGate;}
}
login.addEventListener('click',async()=>{login.disabled=true;try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:'camille'})});if(!r.ok)throw new Error();await load();}catch{status.textContent='La connexion est indisponible. Réessayez.';}finally{login.disabled=false;}});
form.addEventListener('submit',async e=>{e.preventDefault();const button=document.getElementById('accept') as HTMLButtonElement;button.disabled=true;try{const selected=choices.filter(x=>x.checked).map(x=>x.value);if(!hasGiftPreferences&&selected.length>3){status.textContent='Choisissez au maximum trois univers.';return;}const result=await post('accept',{token,preferences:hasGiftPreferences?null:{choices:selected,alcoholFree:alcoholFree.checked,surprise:surprise.checked,birthday:null,privateContactRequested:false,revision:0},displayName:(document.getElementById('display-name') as HTMLInputElement).value});if(result.destination==='/connexion.html'){const link=document.getElementById('journey-link') as HTMLAnchorElement;link.href=googleTestGate?'/test-access':result.destination;link.textContent=googleTestGate?'Se reconnecter avec Google →':'Se connecter au voyage →';}form.hidden=true;status.textContent='Vous faites maintenant partie de l’équipe. Bon voyage !';document.getElementById('journey-link')!.hidden=false;history.replaceState(null,'','/invitation.html');}catch{status.textContent='L’acceptation n’a pas pu être confirmée. Vous pouvez réessayer avec ce même lien.';}finally{button.disabled=false;}});
accountForm.addEventListener('submit',async event=>{
 event.preventDefault();const button=accountForm.querySelector<HTMLButtonElement>('button')!,password=document.getElementById('invitation-password') as HTMLInputElement;
 if(button.disabled)return;button.disabled=true;
 try{const r=await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:(document.getElementById('invitation-email') as HTMLInputElement).value.trim(),password:password.value,invitationToken:token})});if(!r.ok)throw Error();await load();}
 catch{status.textContent='Connexion refusée ou invitation indisponible. Vérifiez le compte destinataire et le lien.';}
 finally{password.value='';button.disabled=false;}
});
login.hidden=true;
void(async()=>{try{const response=await fetch('/api/auth/config');if(!response.ok)throw Error();const config=await response.json(),mode=config.mode;if(!['demo','provisioned'].includes(mode))throw Error();provisioned=mode==='provisioned';googleTestGate=config.googleTestGate===true;if(provisioned){document.querySelector('.demo-label')!.textContent='Invitation personnelle';document.getElementById('invitation-private-help')!.textContent='Acceptez avec le compte destinataire. Votre profil gourmand reste privé et ne sera pas communiqué au dirigeant.';(document.getElementById('journey-link') as HTMLAnchorElement).href='/connexion.html';}await load();}catch{status.textContent='Lecture indisponible. Rechargez la page.';}})();

const journeyLink=document.getElementById('journey-link') as HTMLAnchorElement;
journeyLink.addEventListener('click',async event=>{
 if(!googleTestGate||journeyLink.hidden||journeyLink.getAttribute('href')!=='/test-access')return;
 event.preventDefault();
 journeyLink.setAttribute('aria-disabled','true');
 try{
  const response=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:'{}'});
  if(!response.ok)throw Error();
  location.assign('/test-access');
 }catch{
  status.textContent='La session d’inscription ne peut pas être fermée. Réessayez avant de vous reconnecter.';
  journeyLink.removeAttribute('aria-disabled');
 }
});
