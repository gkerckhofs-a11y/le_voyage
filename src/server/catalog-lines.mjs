import {dateOnly} from '../operations/composition.mjs';
const fail=status=>Object.assign(new Error('Catalog lines unavailable'),{status});
export function normalizeCatalogSelection(selection){
 if(selection===null)return null;
 if(!selection||Object.keys(selection).sort().join(',')!=='lines,revision'||!Number.isSafeInteger(selection.revision)||selection.revision<0||!Array.isArray(selection.lines)||!selection.lines.length||selection.lines.length>10)throw fail(400);
 const lines=selection.lines.map(line=>{if(!line||Object.keys(line).sort().join(',')!=='id,quantity'||typeof line.id!=='string'||!/^[a-z0-9-]{1,48}$/.test(line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>100)throw fail(400);return {id:line.id,quantity:line.quantity};});
 if(new Set(lines.map(l=>l.id)).size!==lines.length)throw fail(400);return {revision:selection.revision,lines};
}
export const selectionKey=s=>JSON.stringify(s?{revision:s.revision,lines:s.lines.map(({id,quantity})=>({id,quantity}))}:null);
export function resolveCatalogLines(catalog,selection,{dueDate,asOf}){
 if(!catalog||catalog.revision!==selection.revision)throw fail(409);
 if(!dateOnly(dueDate)||!dateOnly(asOf)||dueDate<asOf)throw fail(422);
 const days=(Date.parse(dueDate)-Date.parse(asOf))/86400000,month=Number(dueDate.slice(5,7));
 const lines=selection.lines.map(({id,quantity})=>{
  const p=catalog.products.find(p=>p.id===id),m=catalog.masterById?.[id];
  if(!p||!p.active||p.alcohol||p.availability!=='available'||p.leadDays>days||!p.seasonMonths.includes(month)||(m?.stockQuantity!==null&&m?.stockQuantity!==undefined&&m.stockQuantity<quantity))throw fail(422);
  return {id,sku:m?.sku??id,name:p.name,supplier:p.supplier,description:p.composition,restrictions:p.restrictions,quantity,unitPurchaseCents:p.purchaseCents,linePurchaseCents:p.purchaseCents*quantity,vatBasisPoints:m?.vatBasisPoints??null,priceBasis:m?'HTVA':'unspecified'};
 });
 const purchaseCents=lines.reduce((sum,l)=>sum+l.linePurchaseCents,0),composition=`Catalogue v${selection.revision} : `+lines.map(l=>`${l.quantity} × ${l.name} [${l.id}]`).join(' ; '),supplier=[...new Set(lines.map(l=>l.supplier))].join(' / ');
 if(!Number.isSafeInteger(purchaseCents)||purchaseCents>100000000||composition.length>600||supplier.length>120)throw fail(422);
 return {lines,purchaseCents,composition,supplier};
}
