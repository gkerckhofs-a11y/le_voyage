export function setNavigationCompany(name:string){
 const link=document.getElementById('company-journey-link');if(link)link.textContent='Le Voyage '+name;
}
export function installTeamNavigation(){
 document.body.classList.add('team-navigation');
 let nav=document.querySelector<HTMLElement>('.header nav');if(!nav){nav=document.createElement('nav');document.querySelector('.header')?.append(nav);}
 nav.setAttribute('aria-label','Navigation principale');
 const journal=document.getElementById('journal-open');if(journal)document.querySelector('.page-bottom')?.append(journal);
 const switcher=document.getElementById('workspace-switch');if(switcher)document.querySelector('.header')?.append(switcher);
 const attention=document.getElementById('attentions-open')??document.createElement('a');
 if(attention instanceof HTMLAnchorElement){attention.href='/index.html?attentions=1';attention.textContent='Mes attentions';}
 nav.replaceChildren();
 const team=document.createElement('a');team.href='/index.html';team.textContent='Le voyage d’équipe';
 const company=document.createElement('a');company.href='/collectif.html';company.id='company-journey-link';company.textContent='Le Voyage de l’entreprise';
 const choices=document.createElement('a');choices.href='/choix.html';choices.textContent='Nos choix';
 const path=location.pathname;
 if(path==='/'||path==='/index.html'){team.setAttribute('aria-current','page');if(location.search.includes('attentions=1')){team.removeAttribute('aria-current');attention.setAttribute('aria-current','page');}}
 else if(path==='/collectif.html')company.setAttribute('aria-current','page');
 else if(['/choix.html','/preferences.html','/equipe.html'].includes(path))choices.setAttribute('aria-current','page');
 nav.append(team,company,attention,choices);
 new ResizeObserver(()=>{document.body.style.setProperty('--team-nav-height',nav!.getBoundingClientRect().height+'px');}).observe(nav);
}
