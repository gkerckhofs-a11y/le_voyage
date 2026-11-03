const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(n/100);
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
let selected=null,model,busy,send;
function cents(id){const value=$(id).value;if(!/^\d+(?:\.\d{1,2})?$/.test(value))return NaN;const [whole,fraction='']=value.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));}
const row=()=>model?.giftPreparation?.rows?.find(r=>r.unlockId===$('gift-recipient').value);
function estimate(){
 const r=row(),product=model.giftPreparation.catalog.products.find(p=>p.id===$('gift-product').value),quantity=Number($('gift-quantity').value),packaging=cents('gift-packaging'),transport=cents('gift-transport');
 const total=product?Math.floor((product.purchaseExTaxCents*quantity*(10000+product.vatBasisPoints)+5000)/10000)+packaging+transport:NaN;
 $('gift-restrictions').textContent=product?'Restrictions du produit : '+(product.restrictions||'non précisées ; à vérifier.'):'Aucune référence sélectionnée.';
 $('gift-estimate').textContent=Number.isSafeInteger(total)?'Estimation, taxes incluses : '+money(total)+' / '+money(r.allocatedCents)+'.':'Choisissez une référence disponible.';
 $('gift-save').disabled=busy||!r||r.draft?.status==='reviewed'||!Number.isSafeInteger(total)||total>r.allocatedCents;
}
function choose(){
 const r=row();if(!r)return;selected=r.unlockId;const d=r.draft;
 $('gift-due').value=d?.dueDate??model.giftPreparation.suggestedDueDate;$('gift-product').value=d?.quote.selection.lines[0]?.id??$('gift-product').options[0]?.value??'';$('gift-quantity').value=d?.quote.selection.lines[0]?.quantity??1;$('gift-packaging').value=((d?.quote.packagingInclTaxCents??50)/100).toFixed(2);$('gift-transport').value=((d?.quote.transportInclTaxCents??0)/100).toFixed(2);
 $('gift-preferences').textContent=r.preferences.hasPreferences?'Préférences : '+(r.preferences.choices.map(k=>({tea:'infusions',chocolate:'chocolats',delicatessen:'épicerie',beer:'bière',wine:'vin'}[k]??k)).join(', ')||'surprise / sans catégorie')+(r.preferences.alcoholFree?' · sans alcool.':'.'):'Préférences non renseignées : vérification humaine requise.';
 $('gift-contact-label').hidden=!r.preferences.contactRequired;$('gift-preferences-reviewed').checked=false;$('gift-contact-confirmed').checked=false;
 $('gift-review').disabled=busy||!d||d.status!=='draft';$('gift-reopen').disabled=busy||d?.status!=='reviewed';
 $('gift-state').textContent=d?(d.status==='reviewed'?'Proposition vérifiée, sans réservation ni commande.':'Brouillon à vérifier.')+' Révision '+d.revision+'.':'';
 $('gift-history').replaceChildren(...(d?.audit??[]).map(a=>element('li',({prepare:'Proposition chiffrée',review:'Vérification humaine',reopen:'Réouverture'}[a.kind])+' · '+a.onDate+' · '+a.reason)));
 estimate();
}
export function renderGiftPreparation(m,isBusy,action){
 model=m;busy=isBusy;send=action;const ops=m.role==='operator',view=m.giftPreparation;
 $('gift-operator').hidden=!ops;$('gift-personal').hidden=ops;
 if(!ops){$('gift-personal').replaceChildren(...view.proposals.map(p=>element('p',p.status==='reviewed'?'Proposition vérifiée : '+p.composition+' · prévue le '+p.dueDate+'.':'Une proposition est en préparation.')));if(!view.proposals.length)$('gift-personal').append(element('p','Aucune proposition préparée pour le moment.'));return;}
 $('gift-preparation-form').hidden=view.rows.length===0;$('gift-empty').hidden=view.rows.length>0;
 const select=$('gift-recipient');select.replaceChildren(...view.rows.map(r=>{const option=element('option',r.label+' · '+(m.roles.find(p=>p.id===r.uid)?.label??'Bénéficiaire fictif')+' · '+money(r.allocatedCents));option.value=r.unlockId;return option;}));if(view.rows.some(r=>r.unlockId===selected))select.value=selected;select.disabled=busy;
 const products=view.catalog.products.filter(p=>p.active&&!p.alcohol&&p.availability==='available'&&p.vatBasisPoints!==null).sort((a,b)=>a.purchaseExTaxCents-b.purchaseExTaxCents);
 $('gift-product').replaceChildren(...products.map(p=>{const option=element('option',p.name);option.value=p.id;return option;}));$('gift-product').disabled=busy;
 choose();
}
export function setupGiftPreparation(){
 $('gift-recipient').addEventListener('change',choose);for(const id of ['gift-product','gift-quantity','gift-packaging','gift-transport'])$(id).addEventListener('input',estimate);
 function command(){const r=row();return {unlockId:r.unlockId,revision:r.draft?.revision??0,mutationId:crypto.randomUUID(),reason:$('gift-reason').value};}
 $('gift-preparation-form').addEventListener('submit',e=>{e.preventDefault();send({type:'gift-prepare',command:{...command(),selection:{revision:model.giftPreparation.catalog.revision,lines:[{id:$('gift-product').value,quantity:Number($('gift-quantity').value)}]},dueDate:$('gift-due').value,packagingInclTaxCents:cents('gift-packaging'),transportInclTaxCents:cents('gift-transport')}});});
 $('gift-review').addEventListener('click',()=>send({type:'gift-review',command:{...command(),preferencesReviewed:$('gift-preferences-reviewed').checked,contactConfirmed:$('gift-contact-confirmed').checked}}));
 $('gift-reopen').addEventListener('click',()=>send({type:'gift-reopen',command:command()}));
}
