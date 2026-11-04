import {councilSlotTemplate,validateCouncilDraft} from './cite-council-planning.mjs';
import {identifier} from '../cite/economy.ts';

function invalid(){throw Object.assign(Error('Invalid narrative matrix'),{status:400});}
export function compileStory(game,scope,rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>120)invalid();
 const gauges=['economy','wellbeing','culture','infrastructure','environment'];
 const effects=values=>Object.fromEntries(gauges.map((key,i)=>[key,Number(values[i])]));
 const nodes=new Map();
 for(const row of rows){
  if(!Array.isArray(row)||![15,20].includes(row.length)||row.some(cell=>typeof cell!=='string'))invalid();
  const [id,level,title,name,size,narrative,image,next,fallback,failure,...scores]=row;
  const ordinal=Number(level);
  if(!identifier(id)||!Number.isInteger(ordinal)||ordinal<1||ordinal>4||!name||!failure||scores.some(s=>s&&!/^-?\d+$/.test(s)))invalid();
  const failureEffects=row.length===20?effects(scores.slice(5)):{};
  if(row.length===20&&[scores.slice(0,5),scores.slice(5)].some(values=>values.filter(v=>Number(v)!==0).length<2))invalid();
  const template=councilSlotTemplate(game,ordinal);
  if(!template)invalid();
  const node=nodes.get(id)??{id,ordinal,definition:{...template,title,projects:[],failure:{narrative:failure,effects:failureEffects}},fallback,edges:[]};
  if(JSON.stringify(node.definition.failure.effects)!==JSON.stringify(failureEffects)||node.ordinal!==ordinal||node.definition.title!==title||node.fallback!==fallback||node.definition.failure.narrative!==failure||node.edges.length>=2)invalid();
  node.definition.projects.push({id:template.projects[node.edges.length].id,name,category:({petit:'small',standard:'standard',grand:'large'})[size],narrative,...(image?{image}:{}),effects:effects(scores)});
  node.edges.push(next);nodes.set(id,node);
 }
 const roots=[...nodes.values()].filter(n=>n.ordinal===1);
 if(roots.length!==1)invalid();
 const reached=new Set([roots[0].id]);
 for(let level=1;level<=4;level++)for(const n of nodes.values()){
  if(n.ordinal!==level)continue;
  if(!reached.has(n.id))invalid();
  n.definition.mode=n.edges.length===1?'yes-no':'choice';
  n.definition=validateCouncilDraft(game,scope,n.definition,level).definition;
  for(const target of [...n.edges,n.fallback]){
   if(level===4){if(target!=='FIN')invalid();}
   else {if(nodes.get(target)?.ordinal!==level+1)invalid();reached.add(target);}
  }
 }
 return {root:roots[0].id,nodes:Object.fromEntries(nodes)};
}
export function storyDraft(node,date){return {ordinal:node.ordinal,status:'draft',revision:1,definition:node.definition,updatedOn:date,storyId:node.id};}
export function followingNode(story,draft,council){
 const node=story.nodes[draft.storyId];
 const index=node.definition.projects.findIndex(p=>p.id===council.selected);
 const target=index<0?node.fallback:node.edges[index];
 return target==='FIN'?null:story.nodes[target];
}
