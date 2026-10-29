import {initializeApp,applicationDefault,deleteApp} from 'firebase-admin/app';
import {stagingConfig} from '../src/server/staging-config.mjs';
import {createFirestoreAdapter} from '../src/server/firestore-adapter.mjs';
import {createAccessBootstrap} from '../src/server/bootstrap-access.mjs';
// Use only the already isolated staging project. No HTTP route, credential or password input.
let app;
try{
 const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--apply'&&/^[a-f0-9]{64}$/.test(args[1])))throw Error('Invalid arguments');
 const config=stagingConfig();if(config.authenticationMode!=='provisioned')throw Error('Provisioned staging required');
 let size=0;const chunks=[];for await(const chunk of process.stdin){size+=chunk.length;if(size>8192)throw Error('Input too large');chunks.push(chunk);}const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 app=initializeApp({projectId:config.projectId,credential:applicationDefault()});const service=createAccessBootstrap(createFirestoreAdapter(app));
 const result=args.length?await service.apply(input,args[1]):await service.preview(input);process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch{process.stderr.write('Préparation refusée : vérifier le projet isolé, le manifeste, le compte et l’état existant. Aucun secret affiché.\n');process.exitCode=1;}
finally{if(app)await deleteApp(app);}
