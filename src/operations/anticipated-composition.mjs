import {suggestComposition} from './composition.mjs';
import {addDays} from '../domain/calendar.ts';
export function anticipatedComposition(catalog,input){
 // Preview uses declared stock only; the ledger is checked on explicit reservation.
 const products=catalog.products.filter(p=>catalog.masterById?.[p.id]?.stockQuantity!==0);
 const result=suggestComposition(products,input);
 const lines=result.lines.map(p=>{const m=catalog.masterById?.[p.id];return {id:p.id,sku:m?.sku??p.id,name:p.name,supplier:p.supplier,quantity:1,unitPurchaseCents:p.purchaseCents,leadDays:p.leadDays,declaredStock:m?.stockQuantity??null,vatBasisPoints:m?.vatBasisPoints??null,priceBasis:m?'HTVA':'unspecified',restrictions:p.restrictions};});
 const leadDays=lines.length?Math.max(...lines.map(p=>p.leadDays)):null;
 return {catalogRevision:catalog.revision,lines,missing:result.missing,complete:result.complete,purchaseCents:result.purchaseCents,totalCostCents:result.totalCostCents,remainingCents:result.remainingCents,leadDays,latestOrderDate:leadDays===null?null:addDays(input.dueDate,-leadDays),potentialExposureCents:result.totalCostCents,reservationStatus:'not-managed'};
}
