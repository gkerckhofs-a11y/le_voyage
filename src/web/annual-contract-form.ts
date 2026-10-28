import type {AnnualContract} from '../application/annual-contract.ts';
const el=(id:string)=>document.getElementById(id)!;
const field=(id:string)=>el(id) as HTMLInputElement;
const definitions=[['versionReference','Référence de version proposée',160],['privacyNotice','Mentions de confidentialité proposées',20000],['clauses','Clauses proposées',20000]] as const;
function toggle(){const enabled=field('contract-enabled').checked;el('contract-fields').hidden=!enabled;(el('contract-fields') as HTMLFieldSetElement).disabled=!enabled;}
export function initializeContract(){
 for(const [key,title,limit] of definitions){const label=document.createElement('label'),input=key==='versionReference'?document.createElement('input'):document.createElement('textarea');label.textContent=title;input.id=`contract-${key}`;input.maxLength=limit;input.placeholder='À compléter';if(input instanceof HTMLTextAreaElement)input.rows=6;label.append(input);el('contract-fields').append(label);}
 el('contract-enabled').addEventListener('input',toggle);toggle();
}
export function readContract():AnnualContract|undefined{
 if(!field('contract-enabled').checked)return undefined;
 return {versionReference:field('contract-versionReference').value.trim(),privacyNotice:field('contract-privacyNotice').value.trim(),clauses:field('contract-clauses').value.trim()};
}
export function restoreContract(saved?:AnnualContract){field('contract-enabled').checked=!!saved;for(const [key] of definitions)field(`contract-${key}`).value=saved?.[key]??'';toggle();}
export function renderContract(saved:AnnualContract|null){
 const box=el('annual-contract-preview');box.replaceChildren();box.hidden=!saved;if(!saved)return;
 const heading=document.createElement('h3');heading.textContent='Textes contractuels proposés · non acceptés';box.append(heading);
 const list=document.createElement('dl');for(const [key,title] of definitions){const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=title;detail.textContent=saved[key]||'À compléter';list.append(term,detail);}box.append(list);
 const note=document.createElement('p');note.textContent='La référence saisie est une proposition modifiable. La sauvegarde du brouillon ne constitue ni une acceptation, ni une signature, ni une version contractuelle figée.';box.append(note);
}
