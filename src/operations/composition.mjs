export const categories=['tea','chocolate','grocery','wine','beer','other'];
const fail=()=>Object.assign(new Error('Invalid composition request'),{status:400});
export function dateOnly(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function suggestComposition(products,{allocatedCents,packagingCents,transportCents,dueDate,asOf,categories:chosen}){
 if([allocatedCents,packagingCents,transportCents].some(n=>!Number.isSafeInteger(n)||n<0||n>100000000)||!dateOnly(dueDate)||!dateOnly(asOf)||dueDate<asOf||!Array.isArray(chosen)||!chosen.length||chosen.length>3||new Set(chosen).size!==chosen.length||chosen.some(c=>!categories.includes(c)))throw fail();
 const remaining=allocatedCents-packagingCents-transportCents;if(remaining<0)throw Object.assign(fail(),{status:422});
 const days=Math.floor((Date.parse(dueDate)-Date.parse(asOf))/86400000),month=Number(dueDate.slice(5,7)),lines=[],missing=[];let purchaseCents=0;
 // One unit per requested category, in the operator's explicit priority order.
 // Lowest eligible purchase price, then stable ID. Never spend merely to exhaust budget.
 for(const category of chosen){const item=products.filter(p=>p.active&&p.category===category&&!p.alcohol&&p.availability==='available'&&p.leadDays<=days&&p.seasonMonths.includes(month)&&p.purchaseCents<=remaining-purchaseCents).sort((a,b)=>a.purchaseCents-b.purchaseCents||(a.id<b.id?-1:a.id>b.id?1:0))[0];if(item){lines.push({...item,quantity:1});purchaseCents+=item.purchaseCents;}else missing.push(category);}
 return {lines,missing,purchaseCents,totalCostCents:purchaseCents+packagingCents+transportCents,remainingCents:remaining-purchaseCents,complete:missing.length===0};
}
