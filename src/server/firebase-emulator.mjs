import {initializeApp} from 'firebase-admin/app';
import {randomUUID} from 'node:crypto';
import {createFirestoreAdapter} from './firestore-adapter.mjs';
export const projectId='demo-rc-voyage';
export function assertEmulators(env=process.env){
  if(env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||env.GCLOUD_PROJECT!==projectId||env.NODE_ENV==='production')throw new Error('Isolated local emulators required');
}
/** Emulator-only entry point; never falls back to cloud credentials. */
export function createFirebaseEmulatorAdapter(){
  assertEmulators();return createFirestoreAdapter(initializeApp({projectId},'rc-test-'+randomUUID()));
}
