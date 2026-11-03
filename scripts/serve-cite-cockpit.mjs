import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter,assertEmulators} from '../src/server/firebase-emulator.mjs';
import {seedCiteCockpitDemo,citeCockpitDemo} from '../src/server/cite-cockpit-demo.mjs';
import {createFirebaseHttp} from '../src/server/firebase-http.mjs';
import {createDemoServer} from '../src/server/http.mjs';
assertEmulators();if(process.env.K_SERVICE)throw Error('Emulator server only');const adapter=createFirebaseEmulatorAdapter();await seedCiteCockpitDemo(adapter);
const integration=await createFirebaseHttp({adapter,authenticationMode:'provisioned',citeOptions:{catalogDocument:citeCockpitDemo.catalogDocument,today:()=>citeCockpitDemo.date}});
const server=createDemoServer({root:resolve('dist-web'),directory:resolve('.cite-cockpit-state'),apiHandler:integration.handler});server.listen(Number(process.env.PORT||4176),'127.0.0.1',()=>console.log('Authenticated Cité cockpit ready on local emulators.'));
async function stop(){server.close();server.closeAllConnections();await integration.close();process.exit(0);}process.once('SIGINT',stop);process.once('SIGTERM',stop);
