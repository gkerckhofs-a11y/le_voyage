import {renderGiftPreparation,setupGiftPreparation} from './gift-preparation.js';
const $=id=>document.getElementById(id);let csrf='',busy=false,fatal=false,view=null;
function lock(value){busy=value;$('cite-refresh').disabled=value||fatal;$('cite-logout').disabled=value||!csrf;if(view&&!fatal)renderGiftPreparation(view,value,act);}
function lost(status){csrf='';fatal=true;$('cite-content').replaceChildren();$('cite-content').hidden=true;$('cite-title').textContent='Cockpit La Cité';$('cite-status').textContent='Cet accès n’est plus disponible. Revenez à vos espaces pour poursuivre.';if(status===401)location.replace('/connexion.html?app=cite');}
async function load(){
 const response=await fetch('/api/cite/cockpit',{cache:'no-store'});if([401,403].includes(response.status)){lost(response.status);return false;}if(!response.ok)throw Error('Lecture momentanément indisponible.');
 const data=await response.json();csrf=data.csrf;$('cite-title').textContent=data.cityName;$('cite-content').hidden=false;
 view={role:'operator',giftPreparation:data.giftPreparation,roles:data.giftPreparation.rows.map(r=>({id:r.uid,label:r.beneficiaryName}))};renderGiftPreparation(view,false,act);return true;
}
async function refresh(){if(busy||fatal)return;lock(true);$('cite-status').textContent='Vérification de votre accès…';try{if(await load())$('cite-status').textContent='Les attentions de cet espace sont à jour.';}catch(e){$('cite-status').textContent=e.message;}finally{lock(false);}}
async function act(action){
 if(busy||fatal)return;lock(true);$('cite-status').textContent='Enregistrement…';
 try{const type=action.type.slice('gift-'.length),response=await fetch('/api/cite/cockpit/'+type,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify({command:action.command})});if([401,403].includes(response.status)){lost(response.status);return;}
  const ok=response.ok;if(await load())$('cite-status').textContent=ok?'Modification enregistrée.':'Action refusée. La proposition a été rechargée ; vérifiez son état et les données saisies.';
 }catch(e){$('cite-status').textContent='Enregistrement non confirmé. Actualisez avant de réessayer.';}finally{lock(false);}
}
$('cite-refresh').addEventListener('click',()=>void refresh());$('cite-logout').addEventListener('click',async()=>{if(busy||!csrf)return;lock(true);try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:'{}'});if(!r.ok&&r.status!==401)throw Error();location.replace('/connexion.html?app=cite');}catch{$('cite-status').textContent='Déconnexion non confirmée. Revenez à vos espaces.';}finally{lock(false);}});
setupGiftPreparation();void refresh();
