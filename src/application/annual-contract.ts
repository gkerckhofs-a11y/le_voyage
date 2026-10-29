export type AnnualContract={privacyNotice:string;clauses:string;versionReference:string};
/** Proposed text only: no acceptance, signature, immutable version or activation. */
export function previewAnnualContract(input:AnnualContract|undefined){
 if(input===undefined)return null;
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['privacyNotice','clauses','versionReference'].includes(key)))throw new Error('Invalid contract draft fields');
 const text=(value:unknown,limit:number)=>{if(typeof value!=='string'||value.length>limit)throw new Error('Bounded contract draft text required');return value.trim();};
 return {privacyNotice:text(input.privacyNotice,20000),clauses:text(input.clauses,20000),versionReference:text(input.versionReference,160)};
}
