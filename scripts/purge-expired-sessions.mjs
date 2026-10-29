import {initializeApp,applicationDefault,deleteApp} from 'firebase-admin/app';
import {stagingConfig} from '../src/server/staging-config.mjs';
import {createFirestoreAdapter} from '../src/server/firestore-adapter.mjs';
import {createSessionMaintenance} from '../src/server/session-maintenance.mjs';
let app;
try{
 const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--apply'&&/^[a-f0-9]{64}$/.test(args[1])))throw Error();
 const config=stagingConfig();if(config.authenticationMode!=='provisioned')throw Error();
 let size=0;const chunks=[];for await(const chunk of process.stdin){size+=chunk.length;if(size>1024)throw Error();chunks.push(chunk);}const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 app=initializeApp({projectId:config.projectId,credential:applicationDefault()});const service=createSessionMaintenance(createFirestoreAdapter(app));
 const result=args.length?await service.apply(input,args[1]):await service.preview(input);process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch{process.stderr.write('Nettoyage refusé : vérifier le projet isolé, la date limite, le lot et son aperçu. Aucun contenu de session affiché.\n');process.exitCode=1;}
finally{if(app)await deleteApp(app);}
