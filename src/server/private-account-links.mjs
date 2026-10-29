import {open,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
/** Reserve a private new file before generating sensitive links; never overwrite. */
export async function writePrivateAccountLinks(path,generate){
 const destination=resolve(path),file=await open(destination,'wx',0o600);
 try{const data=await generate();await file.writeFile(JSON.stringify(data,null,2)+'\n');await file.close();return destination;}
 catch(error){await file.close().catch(()=>{});await unlink(destination).catch(()=>{});throw error;}
}
