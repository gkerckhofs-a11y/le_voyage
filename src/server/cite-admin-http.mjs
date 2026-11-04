import {createCiteAdminService} from './cite-admin.mjs';
import {body,authorized} from './http.mjs';
import {COUNCIL_IMPORT_MAX_BYTES} from './cite-council-import.mjs';
const fail=status=>Object.assign(Error('Cité administration refused'),{status});
export function createCiteAdminHttp(adapter,options={}){
 const admin=createCiteAdminService(adapter,options);
 return {access:admin.access,async handle(req,json,path,session){
  if(session.workspaceSpace!=='cite-admin'||!session.workspaceEnabled||!session.scope)throw fail(403);
  if(path==='/api/cite/admin'&&req.method==='GET'){json(200,{...await admin.read(session.header,session.scope),csrf:session.csrf});return;}
  const actions={'preview-starter':[admin.previewStarter,[]],'correct-performance':[admin.correctPerformance,['familyId','weekId','scores','expectedScores','revision','reason','mutationId']],'preview-import':[admin.previewImport,['councils']],'import-drafts':[admin.importDrafts,['councils','fingerprint']],'save-draft':[admin.saveDraft,['definition','revision']],'publish-draft':[admin.publishDraft,['councilId','revision']],performance:[admin.performance,['familyId','weekId','scores']],'close-week':[admin.closeWeek,['familyId','weekId']],'close-vote':[admin.closeVote,['councilId','round']],'close-funding':[admin.closeFunding,['councilId']]},name=path.slice('/api/cite/admin/'.length);
  if(req.method!=='POST'||!Object.hasOwn(actions,name)||path!=='/api/cite/admin/'+name)throw fail(404);authorized(req,session);const [action,fields]=actions[name],input=await body(req,fields,['preview-import','import-drafts'].includes(name)?COUNCIL_IMPORT_MAX_BYTES:name==='save-draft'?16384:4096);json(200,{...await action(session.header,session.scope,input),csrf:session.csrf});
 }};
}
