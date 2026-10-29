/** Strict decimal input; no floating-point multiplication, rounding or currency conversion. */
export function euroCents(value:string):number{
 const text=value.trim();if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))throw new Error('Montant en euros attendu, avec au plus deux décimales.');
 const [whole,decimal='']=text.split(/[.,]/),cents=BigInt(whole)*100n+BigInt(decimal.padEnd(2,'0'));
 if(cents>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Montant trop élevé.');return Number(cents);
}
export function euroInput(cents:number){if(!Number.isSafeInteger(cents)||cents<0)throw new Error('Invalid cents');const n=BigInt(cents);return `${n/100n},${String(n%100n).padStart(2,'0')}`;}
export function euroLabel(cents:number){const [whole,decimal]=euroInput(cents).split(',');return `${BigInt(whole).toLocaleString('fr-BE')},${decimal} €`;}
