import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

/** Local demo adapter ONLY: serialized in one Node process; atomic replacement; no multi-process claim. */
export class FileSessionStore {
  #directory; #tails=new Map();
  constructor(directory){this.#directory=resolve(directory);}
  #path(token){if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Invalid session');return resolve(this.#directory,createHash('sha256').update(token).digest('hex')+'.json');}
  async #read(token){try{return JSON.parse(await readFile(this.#path(token),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async #write(token,record){
    await mkdir(this.#directory,{recursive:true,mode:0o700});
    const file=this.#path(token),temporary=file+'.'+randomBytes(8).toString('hex')+'.tmp';
    try{
      const handle=await open(temporary,'wx',0o600);
      try{await handle.writeFile(JSON.stringify(record));await handle.sync();}finally{await handle.close();}
      await rename(temporary,file);
      const directory=await open(this.#directory,'r');try{await directory.sync();}finally{await directory.close();}
    }finally{await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  }
  async transact(token,operation){
    const previous=this.#tails.get(token)??Promise.resolve();
    const next=previous.then(async()=>{
      const current=await this.#read(token),result=await operation(current);
      if(result.record&&result.record!==current)await this.#write(token,result.record);
      return structuredClone(result.value);
    });
    const tail=next.then(()=>undefined,()=>undefined);this.#tails.set(token,tail);
    try{return await next;}finally{if(this.#tails.get(token)===tail)this.#tails.delete(token);}
  }
  read(token){return this.transact(token,record=>({record,value:record}));}
  async create(record){const token=randomBytes(32).toString('hex');await this.transact(token,()=>({record,value:null}));return token;}
}
