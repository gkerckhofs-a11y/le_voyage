type Access={uid:string;tenantId:string;campaignId:string;revision:number;director:boolean;kiosk:boolean};
export async function initAccessAdmin(csrf:string){
 const root=document.getElementById('access-admin')!;
 const config=await fetch('/api/auth/config');if(!config.ok||(await config.json()).mode!=='provisioned')return;
 root.hidden=false;
 const search=document.getElementById('access-search') as HTMLFormElement,change=document.getElementById('access-change') as HTMLFormElement,status=document.getElementById('access-status')!,uid=document.getElementById('access-uid') as HTMLInputElement;
 let current:Access|null=null,busy=false;
 const lock=(value:boolean)=>{busy=value;root.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement>('input,button,select').forEach(e=>e.disabled=value);};
 const send=async(path:string,data:unknown)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});if(!r.ok)throw Error();return r.json();};
 uid.addEventListener('input',()=>{current=null;change.hidden=true;document.getElementById('access-current')!.textContent='';});
 search.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;lock(true);current=null;change.hidden=true;status.textContent='Lecture des accès…';
  try{current=await send('/api/access/read',{uid:uid.value.trim()});document.getElementById('access-current')!.textContent=`Compte ${current!.uid} · Directeur : ${current!.director?'autorisé':'absent'} · Écran TV : ${current!.kiosk?'autorisé':'absent'}`;change.hidden=false;status.textContent='Accès de cette campagne actualisés.';}
  catch{document.getElementById('access-current')!.textContent='';status.textContent='Consultation refusée ou indisponible. Vérifiez le compte et vos permissions.';}
  finally{lock(false);}
 });
 change.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!current)return;lock(true);const reason=document.getElementById('access-reason') as HTMLInputElement;
  const {uid,tenantId,campaignId,revision}=current;
  try{await send('/api/access/save',{uid,tenantId,campaignId,revision,space:(document.getElementById('access-role') as HTMLSelectElement).value,enabled:(document.getElementById('access-action') as HTMLSelectElement).value==='true',reason:reason.value,mutationId:crypto.randomUUID()});status.textContent='Modification enregistrée. Consultez les accès pour vérifier la situation actuelle.';reason.value='';}
  catch{status.textContent='Modification non confirmée. Consultez à nouveau les accès avant toute nouvelle tentative.';}
  finally{current=null;change.hidden=true;document.getElementById('access-current')!.textContent='';lock(false);}
 });
}
