import {initializeApp,applicationDefault,deleteApp} from 'firebase-admin/app';
import {writePrivateAccountLinks} from '../src/server/private-account-links.mjs';
import {stagingConfig} from '../src/server/staging-config.mjs';
import {createFirestoreAdapter} from '../src/server/firestore-adapter.mjs';
import {createAccountPreparation} from '../src/server/account-preparation.mjs';
let app;
try{
 const args=process.argv.slice(2);if(args.length&&!(args.length===2&&((args[0]==='--create'&&/^[a-f0-9]{64}$/.test(args[1]))||(args[0]==='--links'&&args[1]))))throw Error();
 const config=stagingConfig();if(config.authenticationMode!=='provisioned')throw Error();
 let size=0;const chunks=[];for await(const chunk of process.stdin){size+=chunk.length;if(size>4096)throw Error();chunks.push(chunk);}const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 app=initializeApp({projectId:config.projectId,credential:applicationDefault()});const service=createAccountPreparation(createFirestoreAdapter(app));
 if(args[0]==='--links'){
  const path=await writePrivateAccountLinks(args[1],()=>service.links(input));
  process.stdout.write(JSON.stringify({linksPrepared:true,file:path})+'\n');
 }else{const result=args.length?await service.create(input,args[1]):await service.preview(input);process.stdout.write(JSON.stringify(result,null,2)+'\n');}
}catch{process.stderr.write('Préparation refusée. Vérifiez le projet isolé, le manifeste, le compte et le fichier de destination. Aucun lien secret affiché.\n');process.exitCode=1;}
finally{if(app)await deleteApp(app);}
