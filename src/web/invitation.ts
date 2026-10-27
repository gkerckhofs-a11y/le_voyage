const token=location.hash.slice(1),status=document.getElementById('invitation-status')!,login=document.getElementById('recipient-login') as HTMLButtonElement,form=document.getElementById('accept-form') as HTMLFormElement;
let csrf='';
async function post(path:string,data:unknown){const r=await fetch('/api/invitation/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});if(!r.ok)throw new Error('Unavailable');return r.json();}
async function load(){
 form.hidden=true;
 if(!/^[a-f0-9]{64}$/.test(token)){status.textContent='Ce lien est incomplet. Rouvrez le lien reçu.';login.hidden=true;document.getElementById('journey-link')!.hidden=false;return;}
 try{csrf=(await post('session',{})).csrf;const invitation=await post('preview',{token});document.getElementById('invitation-context')!.textContent=`${invitation.organizationName} · ${invitation.teamName}`;login.hidden=true;
 if(invitation.status==='accepted'){status.textContent='Vous avez déjà rejoint cette équipe.';document.getElementById('journey-link')!.hidden=false;}else{form.hidden=false;status.textContent='Votre invitation est prête. Choisissez votre nom affiché.';}}
 catch{status.textContent='Connectez-vous avec le compte destinataire. Un lien expiré, révoqué ou destiné à une autre personne ne peut pas être utilisé.';login.hidden=false;}
}
login.addEventListener('click',async()=>{login.disabled=true;try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:'camille'})});if(!r.ok)throw new Error();await load();}catch{status.textContent='La connexion est indisponible. Réessayez.';}finally{login.disabled=false;}});
form.addEventListener('submit',async e=>{e.preventDefault();const button=document.getElementById('accept') as HTMLButtonElement;button.disabled=true;try{await post('accept',{token,displayName:(document.getElementById('display-name') as HTMLInputElement).value});form.hidden=true;status.textContent='Vous faites maintenant partie de l’équipe. Bon voyage !';document.getElementById('journey-link')!.hidden=false;history.replaceState(null,'','/invitation.html');}catch{status.textContent='L’acceptation n’a pas pu être confirmée. Vous pouvez réessayer avec ce même lien.';}finally{button.disabled=false;}});
void load();
