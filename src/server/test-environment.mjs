import {assertEmulators,projectId} from './firebase-emulator.mjs';
import {stagingConfig} from './staging-config.mjs';
/** Services may use local emulators OR the explicitly configured isolated Cloud test project. */
export function assertTestAdapter(adapter,env=process.env){
 let expected;
 if(env.RC_STAGE==='isolated-test')expected=stagingConfig(env).projectId;
 else{assertEmulators(env);expected=projectId;}
 if(adapter?.auth?.app?.options?.projectId!==expected||adapter?.db?.projectId!==expected)throw Error('Test adapter project mismatch');
}
