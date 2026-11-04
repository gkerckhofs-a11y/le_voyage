import {councilSlotTemplate} from './cite-council-planning.mjs';
export const PILOT_SCENARIO={version:'cite-four-council-starter-v1',label:'Quatre choix pour notre Cité — scénario d’essai'};
export function canLoadPilotScenario(record,date){
 if(record.pilotSetup?.kind!=='four-council-pilot'||record.state.config.weeks.length!==16||record.councils.order.length||Object.keys(record.councilDrafts??{}).length)return false;
 const first=councilSlotTemplate({economy:record.state},1);return !!first&&date<first.firstVoteClosesOn;
}
/** Proposed editorial content only: no ballot, event selection, score or funding is generated. */
export function pilotScenarioDrafts(game){
 const contents=[
  {title:'Bibliothèque ou hôpital ?',mode:'choice',projects:[{name:'Bibliothèque',category:'small',effects:{culture:15,economy:-3},narrative:'Les habitants disposent d’un lieu pour apprendre, lire et transmettre leur histoire.'},{name:'Hôpital',category:'small',effects:{wellbeing:15,economy:-3},protection:'epidemic',narrative:'Une équipe de soins accueille les habitants. La cité dispose désormais d’une protection contre les épidémies.'}]},
  {title:'Construire une caserne ?',mode:'yes-no',projects:[{name:'Caserne',category:'small',effects:{infrastructure:10,wellbeing:4,environment:-3},protection:'fire',narrative:'Une caserne renforce les secours et protège la cité contre les incendies, au prix d’un nouvel espace construit.'}]},
  {title:'Préserver le cadre de vie ?',mode:'yes-no',projects:[{name:'Jardin de quartier',category:'small',effects:{wellbeing:8,environment:6,economy:-2},narrative:'Un jardin offre un espace de rencontre et de respiration. Son entretien mobilise une part des moyens de la cité.'}]},
  {title:'Ouvrir de nouveaux ateliers ?',mode:'yes-no',projects:[{name:'Ateliers',category:'standard',effects:{economy:12,infrastructure:4,environment:-5},narrative:'Les ateliers développent l’activité et les équipements. La cité doit aussi assumer leur impact sur l’environnement.'}]}
 ];
 return contents.map((content,i)=>{const template=councilSlotTemplate(game,i+1);if(!template)throw Object.assign(Error('Four Council slots required'),{status:409});return {revision:0,definition:{...template,title:content.title,mode:content.mode,projects:content.projects.map((project,j)=>({id:template.projects[j].id,...project})),failure:{narrative:'Le projet est abandonné. Une occasion de développement est perdue.',effects:{economy:-5,infrastructure:-3}}}};});
}
