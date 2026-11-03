import {createCiteStore} from './cite-store.mjs';
import {normalizeGiftPreferences} from './gift-preferences.mjs';
import {canonicalJSON} from '../cite/canonical.ts';
const fail=status=>Object.assign(Error('Cité preferences unavailable'),{status});
const empty=()=>({choices:[],alcoholFree:false,surprise:false,birthday:null,privateContactRequested:false});
/** Shared tenant preference document; identity and membership always come from the authenticated actor. */
export function createCitePreferencesService(adapter,options={}){
 const store=createCiteStore(adapter,options),{db}=adapter;
 const operate=(header,scope,fn)=>store(header,scope,'member',async(record,uid,_date,{tx})=>{
  const config=record.state.config,family=config.families.find(f=>f.id===scope.familyId);
  if(!family||!config.memberships.some(m=>m.uid===uid&&m.familyId===scope.familyId))throw fail(403);
  const ref=db.doc(`tenants/${scope.tenantId}/giftPreferences/${uid}`),raw=(await tx.get(ref)).data()??{value:empty(),revision:0,updatedAt:null,history:[]};
  let value;try{value=normalizeGiftPreferences({...raw.value,revision:raw.revision});}catch{throw fail(409);}
  const context={cityName:config.name,familyName:family.name,preferences:{...value,revision:raw.revision,updatedAt:raw.updatedAt??null}};
  return {record,value:await fn({ref,raw,value,context,tx})};
 });
 return {
  access:(header,scope)=>operate(header,scope,({context})=>({cityName:context.cityName,familyName:context.familyName})),
  read:(header,scope)=>operate(header,scope,({context})=>context),
  save:async(header,scope,input)=>{
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='alcoholFree,birthday,choices,privateContactRequested,revision,surprise')throw fail(400);
   const proposed=normalizeGiftPreferences(input);
   return operate(header,scope,({ref,raw,value,context,tx})=>{
    if(input.revision>raw.revision)throw fail(409);
    if(canonicalJSON(proposed)===canonicalJSON(value))return context;
    if(input.revision!==raw.revision||raw.revision>=10000)throw fail(409);
    const updatedAt=(options.now??Date.now)(),revision=raw.revision+1;
    tx.set(ref,{value:proposed,revision,updatedAt,history:[...(raw.history??[]),{revision,at:updatedAt}].slice(-20)});
    return {...context,preferences:{...proposed,revision,updatedAt}};
   });
  }
 };
}
