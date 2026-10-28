export type AnnualLogistics = {
 operationalContact:string;
 sites:string;
 deliveryDetails:string;
 receptionLocation:string;
 receptionDetails:string;
 serviceConstraints:string;
 fallbackPlan:string;
 receptionFormulas:readonly string[];
};
/** Private draft notes, never an address verification, booking or contractual approval. */
export function previewAnnualLogistics(input:AnnualLogistics|undefined,tierCount:number){
 if(input===undefined)return null;
 const limits={operationalContact:1000,sites:2000,deliveryDetails:2000,receptionLocation:500,receptionDetails:2000,serviceConstraints:2000,fallbackPlan:2000};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>![...Object.keys(limits),'receptionFormulas'].includes(k)))throw new Error('Invalid logistics fields');
 const text=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max)throw new Error('Bounded logistics text required');return value.trim();};
 if(!Number.isSafeInteger(tierCount)||tierCount<0||tierCount>100||!Array.isArray(input.receptionFormulas)||input.receptionFormulas.length!==tierCount+1)throw new Error('One reception description required per configured level');
 return {operationalContact:text(input.operationalContact,limits.operationalContact),sites:text(input.sites,limits.sites),deliveryDetails:text(input.deliveryDetails,limits.deliveryDetails),receptionLocation:text(input.receptionLocation,limits.receptionLocation),receptionDetails:text(input.receptionDetails,limits.receptionDetails),serviceConstraints:text(input.serviceConstraints,limits.serviceConstraints),fallbackPlan:text(input.fallbackPlan,limits.fallbackPlan),receptionFormulas:input.receptionFormulas.map(value=>text(value,1000))};
}
export type AnnualLogisticsPreview=ReturnType<typeof previewAnnualLogistics>;
