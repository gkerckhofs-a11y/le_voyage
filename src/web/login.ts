const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-profile]')];
for(const button of buttons)button.addEventListener('click',async()=>{
 buttons.forEach(b=>b.disabled=true);document.getElementById('login-status')!.textContent='Votre voyage se prépare…';
 try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:button.dataset.profile})});if(!r.ok)throw new Error();const result=await r.json();location.replace(['/espaces.html','/organisateur.html','/entreprise.html','/kpi-access.html','/kpi.html','/invitations.html','/coordination.html','/cockpit.html','/preferences.html'].includes(result.destination)?result.destination:'/');}
 catch{document.getElementById('login-status')!.textContent='La connexion est indisponible. Réessayez lorsque la démonstration est ouverte.';buttons.forEach(b=>b.disabled=false);}
});

const accountForm=document.querySelector<HTMLFormElement>('#account-login')!;
(async()=>{
 buttons.forEach(b=>b.disabled=true);
 try{
  const response=await fetch('/api/auth/config');if(!response.ok)throw Error();
  const config=await response.json();if(!['demo','provisioned'].includes(config.mode))throw Error();
  if(config.mode==='provisioned'){
   const link=document.getElementById('email-link-entry');if(link)link.hidden=config.emailLinkEnabled!==true;
   buttons.forEach(b=>b.hidden=true);
   document.querySelectorAll<HTMLElement>('.extra-teams,.demo-label,#demo-introduction,.login-card small').forEach(e=>e.hidden=true);
   accountForm.hidden=false;
  }else buttons.forEach(b=>b.disabled=false);
 }catch{document.getElementById('login-status')!.textContent='Connexion momentanément indisponible. Rechargez la page.';}
})();
accountForm.addEventListener('submit',async event=>{
 event.preventDefault();const submit=accountForm.querySelector<HTMLButtonElement>('button')!,password=accountForm.querySelector<HTMLInputElement>('#account-password')!;
 if(submit.disabled)return;submit.disabled=true;
 const status=document.getElementById('login-status')!;status.textContent='Connexion en cours…';
 try{
  const response=await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:accountForm.querySelector<HTMLInputElement>('#account-email')!.value.trim(),password:password.value})});
  if(!response.ok)throw Error();const result=await response.json();if(result.destination!=='/espaces.html')throw Error();location.replace(result.destination);
 }catch{status.textContent='Connexion refusée ou indisponible. Vérifiez vos identifiants et vos accès, puis réessayez.';submit.disabled=false;}
 finally{password.value='';}
});
