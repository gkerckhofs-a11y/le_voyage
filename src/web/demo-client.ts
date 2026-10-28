let csrf='';
function primaryNavigation(){let nav=document.querySelector('.header nav');if(!nav){nav=document.createElement('nav');nav.setAttribute('aria-label','Navigation principale');document.querySelector('.header')?.append(nav);}return nav;}
function check(response:Response){if(response.status===401||response.status===403)location.replace('/connexion.html');if(!response.ok)throw new Error('Demo unavailable');}
export async function startDemo(){
  const response=await fetch('/api/demo/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  check(response);
  const result=await response.json();csrf=result.csrf;
  if(result.workspaceEnabled&&!document.getElementById('workspace-switch')){const a=document.createElement('a');a.id='workspace-switch';a.href='/espaces.html';a.textContent='Changer d’espace';let nav=document.querySelector('.header nav');if(!nav){nav=document.createElement('nav');nav.setAttribute('aria-label','Navigation principale');document.querySelector('.header')?.append(nav);}nav.append(a);}
  if(result.workspaceEnabled){document.body.classList.add('workspace-session');for(const a of document.querySelectorAll<HTMLAnchorElement>('a[href="/connexion.html"]')){if(a.closest('nav'))a.hidden=true;}}
  if(result.workspace==='kpi'){for(const a of document.querySelectorAll<HTMLAnchorElement>('a[href="/collectif.html"],a[href="/semaine.html"],a[href="/equipe.html"],a[href="/kpi-access.html"]'))a.hidden=true;}
  if(result.workspace==='kiosk'){document.body.classList.add('kiosk');document.querySelector<HTMLElement>('.header nav')?.setAttribute('hidden','');document.querySelector<HTMLElement>('.page-bottom')?.setAttribute('hidden','');}
  if(result.workspace==='organizer'){
    for(const a of document.querySelectorAll<HTMLAnchorElement>('a[href="/semaine.html"],a[href="/equipe.html"],a[href="/collectif.html"]'))a.hidden=true;
    if(!document.getElementById('organizer-home')&&location.pathname!=='/organisateur.html'){
      const link=document.createElement('a');link.id='organizer-home';link.href='/organisateur.html';link.textContent='Espace organisateur';primaryNavigation().append(link);
    }
  }
  if(result.canSimulate===false){const simulate=document.getElementById('advance');if(simulate)simulate.hidden=true;}if(result.authenticated){if(!result.workspace||result.workspace==='team'){if(!document.getElementById('my-week-link')){const link=document.createElement('a');link.id='my-week-link';link.href='/semaine.html';link.textContent='Ma semaine';primaryNavigation().append(link);}if(!document.getElementById('team-vote-link')){const link=document.createElement('a');link.id='team-vote-link';link.href='/equipe.html';link.textContent='Choix de l’équipe';primaryNavigation().append(link);}if(!document.getElementById('gift-preferences-link')){const link=document.createElement('a');link.id='gift-preferences-link';link.href='/preferences.html';link.textContent='Mes goûts';primaryNavigation().append(link);}}const nav=document.querySelector('.demo-label');if(nav&&!document.getElementById('logout')){const button=document.createElement('button');button.id='logout';button.textContent='Se déconnecter';button.addEventListener('click',async()=>{try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:'{}'});if(r.ok||r.status===401)location.replace('/connexion.html');else button.textContent='Réessayer la déconnexion';}catch{button.textContent='Réessayer la déconnexion';}});const badge=document.createElement('span');badge.hidden=true;while(nav.firstChild)badge.append(nav.firstChild);nav.append(badge,button);}}
  return result;
}
export async function readDemo<T>(surface:'team'|'collective'):Promise<T>{
  const response=await fetch(`/api/demo/${surface}`);check(response);return response.json();
}
export async function sendDemo<T>(action:'advance'|'claim',data:unknown):Promise<T>{
  const response=await fetch(`/api/demo/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});
  check(response);return response.json();
}
