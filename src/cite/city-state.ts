import {createHash} from 'node:crypto';
import type {Config} from './economy.ts';
export const GAUGES=['economy','wellbeing','culture','infrastructure','environment'] as const;
export type Gauge=typeof GAUGES[number];
export type Gauges=Record<Gauge,number>;
export type Effects=Partial<Gauges>;
export const CRISIS_KINDS=['fire','epidemic','barbarians','drought','earthquake'] as const;
export type CrisisKind=typeof CRISIS_KINDS[number];
export const CITY_RULES={version:'cite-city-prototype-v1',development:'rounded-arithmetic-mean',protection:'half-damage-floor',crisisCouncils:[3,9],ambitionThresholds:[50,80]} as const;
export type Milestone={threshold:50|80;eventId:string};
export type CrisisRecord={id:string;councilId:string;kind:CrisisKind;name:string;protected:boolean;protectors:string[];effects:Effects;damagedBuilding:string|null;occurredOn:string;rulesVersion:typeof CITY_RULES.version};
export type CityState={rules:typeof CITY_RULES;seed:string;commitment:string;ambitions:Record<string,{gauge:Gauge;milestones:Milestone[]}>;crisisPlan:Record<string,CrisisKind>;crises:Record<string,CrisisRecord>;buildingConditions:Record<string,'intact'|'damaged'>};
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function createCityState(config:Config,gauges:Gauges,seed:string):CityState{
 if(typeof seed!=='string'||seed.length<16||seed.length>200)throw Error('A private server seed is required');
 const basis=seed+'\n'+config.tenantId+'\n'+config.seasonId;
 const branches=[...GAUGES].sort((a,b)=>digest(basis+'branch'+a).localeCompare(digest(basis+'branch'+b)));
 const families=[...config.families].sort((a,b)=>digest(basis+'family'+a.id).localeCompare(digest(basis+'family'+b.id)));
 const ambitions=Object.fromEntries(families.map((f,i)=>[f.id,{gauge:branches[i%5],milestones:[] as Milestone[]}]));
 const crisisPlan=Object.fromEntries(CITY_RULES.crisisCouncils.filter(n=>n*4<=config.weeks.length).map(n=>[String(n),CRISIS_KINDS[parseInt(digest(basis+'crisis'+n).slice(0,8),16)%CRISIS_KINDS.length]]));
 const state:CityState={rules:structuredClone(CITY_RULES),seed,commitment:digest(JSON.stringify({basis,ambitions,crisisPlan,rules:CITY_RULES})),ambitions,crisisPlan,crises:{},buildingConditions:{}};
 return observeAmbitions(state,gauges,'city-initialized');
}
/** First observation at/above a threshold is recorded once; never removed by a later decline. */
export function observeAmbitions(city:CityState,gauges:Gauges,eventId:string):CityState{
 const next=structuredClone(city);
 for(const ambition of Object.values(next.ambitions))for(const threshold of CITY_RULES.ambitionThresholds)if(gauges[ambition.gauge]>=threshold&&!ambition.milestones.some(m=>m.threshold===threshold))ambition.milestones.push({threshold,eventId});
 return next;
}
export function development(gauges:Gauges){return Math.round(GAUGES.reduce((sum,k)=>sum+gauges[k],0)/5);}
export const CRISIS_CATALOG:Record<CrisisKind,{name:string;effects:Effects;damagesBuilding:boolean}>= {
 fire:{name:'Incendie',effects:{infrastructure:-18,wellbeing:-8},damagesBuilding:true},
 epidemic:{name:'Épidémie',effects:{wellbeing:-24,economy:-6},damagesBuilding:false},
 barbarians:{name:'Attaque',effects:{economy:-18,infrastructure:-12},damagesBuilding:false},
 drought:{name:'Sécheresse',effects:{environment:-20,economy:-10},damagesBuilding:false},
 earthquake:{name:'Tremblement de terre',effects:{infrastructure:-22,wellbeing:-10},damagesBuilding:true}
};
