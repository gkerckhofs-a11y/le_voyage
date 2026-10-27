let csrf='';
function check(response:Response){if(response.status===401||response.status===403)location.replace('/connexion.html');if(!response.ok)throw new Error('Demo unavailable');}
export async function startDemo(){
  const response=await fetch('/api/demo/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  check(response);
  const result=await response.json();csrf=result.csrf;
  if(result.authenticated){const nav=document.querySelector('.demo-label');if(nav&&!document.getElementById('logout')){const button=document.createElement('button');button.id='logout';button.textContent='Se déconnecter';button.addEventListener('click',async()=>{try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:'{}'});if(r.ok||r.status===401)location.replace('/connexion.html');else button.textContent='Réessayer la déconnexion';}catch{button.textContent='Réessayer la déconnexion';}});const badge=document.createElement('span');badge.hidden=true;while(nav.firstChild)badge.append(nav.firstChild);nav.append(badge,button);}}
}
export async function readDemo<T>(surface:'team'|'collective'):Promise<T>{
  const response=await fetch(`/api/demo/${surface}`);check(response);return response.json();
}
export async function sendDemo<T>(action:'advance'|'claim',data:unknown):Promise<T>{
  const response=await fetch(`/api/demo/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});
  check(response);return response.json();
}
