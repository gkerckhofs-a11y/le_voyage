import {demoMasterSheetsSource} from '../src/server/demo-master-sheets.mjs';
import {createFirebaseEmulatorAdapter} from '../src/server/firebase-emulator.mjs';
import {resolve} from 'node:path';
import {createDemoServer} from '../src/server/http.mjs';
import {createFirebaseHttp} from '../src/server/firebase-http.mjs';
const integration=await createFirebaseHttp({adapter:createFirebaseEmulatorAdapter(),sheetsSource:demoMasterSheetsSource()});
const server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:integration.handler});
server.listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Fictitious emulator application ready; no production services.'));
async function stop(){server.close();server.closeAllConnections();await integration.close();process.exit(0);}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
