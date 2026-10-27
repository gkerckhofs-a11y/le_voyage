const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-profile]')];
for(const button of buttons)button.addEventListener('click',async()=>{
 buttons.forEach(b=>b.disabled=true);document.getElementById('login-status')!.textContent='Votre voyage se prépare…';
 try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:button.dataset.profile})});if(!r.ok)throw new Error();location.replace('/');}
 catch{document.getElementById('login-status')!.textContent='La connexion est indisponible. Réessayez lorsque la démonstration est ouverte.';buttons.forEach(b=>b.disabled=false);}
});
