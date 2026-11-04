import {createCiteStore} from './cite-store.mjs';
import {identifier,submitValues,recordPerformance,closeFamilyWeek,familyEconomyView} from '../cite/economy.ts';
/** New, explicit season capabilities. No route is registered in the legacy application. */
export function createCiteEconomyService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 const operate=(header,scope,permission,action)=>store(header,scope,permission,(record,uid,date)=>{const result=action(record.state,uid,date);return {record:result.state===record.state?record:{...record,state:result.state},value:result.value};});
 function command(value){if(!value||Object.keys(value).sort().join(',')!=='scores,weekId'||!identifier(value.weekId))throw Object.assign(Error('Invalid city command'),{status:400});return value;}
 return {
  read:(header,scope)=>operate(header,scope,'member',state=>({state,value:familyEconomyView(state,scope)})),
  submit:async(header,scope,input)=>{const {weekId,scores}=command(input);return operate(header,scope,'member',(state,uid,date)=>{const next=submitValues(state,scope,uid,weekId,scores,date);return {state:next,value:{accepted:true,weekId}};});},
  performance:async(header,scope,input)=>{const {weekId,scores}=command(input);return operate(header,scope,'manager',(state,_uid,date)=>{const next=recordPerformance(state,scope,weekId,scores,date);return {state:next,value:{accepted:true,weekId}};});},
  close:(header,scope,weekId)=>operate(header,scope,'manager',(state,_uid,date)=>{const result=closeFamilyWeek(state,scope,weekId,date);return {state:result.state,value:result.deferred?{status:'deferred'}:{status:'credited',credit:structuredClone(result.credit)}};})
 };
}
