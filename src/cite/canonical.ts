/** JSON data equality independent of Firestore map-field order. Array order remains meaningful. */
export function canonicalJSON(value:unknown):string{
 function normalize(v:unknown):unknown{
  if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
  if(Array.isArray(v))return v.map(normalize);
  if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize((v as Record<string,unknown>)[k])]));
  throw Error('Expected JSON data');
 }
 return JSON.stringify(normalize(value));
}
