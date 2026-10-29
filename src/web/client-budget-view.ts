export type ClientBudget={status:'unavailable'}|{status:'published';revision:number;basis:'HT'|'TTC';currency:'EUR';reference:string;asOf:string;allocatedCents:number;committedCents:number;consumedCents:number;remainingCents:number};
export const euros=(cents:number)=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(cents/100);
export function renderClientBudget(root:HTMLElement,data:ClientBudget){
 root.replaceChildren();const p=document.createElement('p');
 if(data.status==='unavailable'){p.textContent='Les montants alloués, engagés, consommés et restants ne sont pas encore disponibles dans cet espace.';root.append(p);return;}
 p.textContent=`Situation déclarée par Rouge Clémence au ${data.asOf} · ${data.basis} · Révision ${data.revision} · Référence ${data.reference}`;root.append(p);
 const list=document.createElement('dl');for(const [label,value] of [['Alloué',data.allocatedCents],['Engagé (consommé inclus)',data.committedCents],['Consommé',data.consumedCents],['Restant à engager',data.remainingCents]] as const){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=euros(value);list.append(dt,dd);}root.append(list);
 const note=document.createElement('p');note.textContent='Restant = alloué − engagé. Le consommé est déjà compris dans l’engagé. Ces montants client ne constituent pas un état des paiements.';root.append(note);
}
