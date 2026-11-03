import {createCiteFamilyService} from './cite-family.mjs';
import {createCitePreferencesService} from './cite-preferences.mjs';
import {body,authorized} from './http.mjs';
const fail=status=>Object.assign(Error('Cité member access refused'),{status});
export function createCiteMemberHttp(adapter,options={}){
 const preferences=createCitePreferencesService(adapter,options),family=createCiteFamilyService(adapter,options);
 return {access:preferences.access,async handle(req,json,path,session){
  if(session.workspaceSpace!=='cite-member'||!session.workspaceEnabled||!session.scope)throw fail(403);
  if(path==='/api/cite/family'&&req.method==='GET'){json(200,{...await family.read(session.header,session.scope),csrf:session.csrf});return;}
  if(path==='/api/cite/family/vote'&&req.method==='POST'){authorized(req,session);const input=await body(req,['councilId','round','choice']);json(200,{...await family.vote(session.header,session.scope,input),csrf:session.csrf});return;}
  if(path==='/api/cite/family/weekly'&&req.method==='POST'){authorized(req,session);const input=await body(req,['weekId','scores']);json(200,{...await family.submit(session.header,session.scope,input),csrf:session.csrf});return;}
  if(path==='/api/cite/family/pledge'&&req.method==='POST'){authorized(req,session);const input=await body(req,['councilId','amount','revision','mutationId']);json(200,{...await family.contribute(session.header,session.scope,input),csrf:session.csrf});return;}
  if(path!=='/api/cite/preferences')throw fail(404);
  if(req.method==='GET'){json(200,{...await preferences.read(session.header,session.scope),csrf:session.csrf});return;}
  if(req.method!=='POST')throw fail(404);
  authorized(req,session);const input=await body(req,['preferences']);json(200,{...await preferences.save(session.header,session.scope,input.preferences),csrf:session.csrf});
 }};
}
