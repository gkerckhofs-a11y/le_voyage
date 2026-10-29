import { resolve } from 'node:path';
import { createDemoServer } from '../src/server/http.mjs';
const root=resolve(import.meta.dirname,'../dist-web');
const directory=process.env.RC_DEMO_DIRECTORY??resolve(import.meta.dirname,'../.demo-state');
const port=Number(process.env.PORT||4173);
const server=createDemoServer({root,directory});
server.listen(port,'0.0.0.0',()=>console.log(`Local fictitious demo on port ${port}; no Firebase connection.`));
