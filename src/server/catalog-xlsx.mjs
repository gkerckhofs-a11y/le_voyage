import {Worker} from 'node:worker_threads';
let active=0;
export function decodeMasterXlsx(base64){
 if(typeof base64!=='string'||base64.length>666668||!base64.length||base64.length%4!==0||! /^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Object.assign(Error('Invalid XLSX'),{status:400});
 const bytes=Buffer.from(base64,'base64');if(bytes.length>500000||bytes.toString('base64')!==base64)throw Object.assign(Error('Invalid XLSX'),{status:400});
 if(active>=2)throw Object.assign(Error('XLSX busy'),{status:429});active++;
 return new Promise(resolve=>{let done=false;const worker=new Worker(new URL('./catalog-xlsx-worker.mjs',import.meta.url),{workerData:bytes,resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:16}}),finish=value=>{if(done)return;done=true;clearTimeout(timer);void worker.terminate().finally(()=>{active--;resolve(value);});},timer=setTimeout(()=>finish({error:'Lecture XLSX trop longue. Simplifiez le classeur.'}),10000);
  worker.once('message',finish);worker.once('error',()=>finish({error:'Classeur XLSX illisible ou trop complexe.'}));worker.once('exit',()=>finish({error:'Lecture XLSX interrompue.'}));
 });
}
