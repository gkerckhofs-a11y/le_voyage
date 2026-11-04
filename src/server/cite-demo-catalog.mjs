import {demoSupplierCatalog} from './supplier-catalog.mjs';
/** Synthetic Master metadata, including a fictional 6% rate for arithmetic tests only. */
export function citeDemoCatalog(){
 const c=demoSupplierCatalog();return {...c,masterById:Object.fromEntries(c.products.map(p=>[p.id,{sku:'FICTION-'+p.id,vatBasisPoints:600,stockQuantity:20}]))};
}
export const citeDemoPreferences=()=>Object.fromEntries(Array.from({length:3},(_,f)=>Array.from({length:2},(_,m)=>[`person-${f}-${m}`,{revision:1,value:{choices:['tea','chocolate'],alcoholFree:true,surprise:false,birthday:null,privateContactRequested:false}}])).flat());
