import {distanceFromRoute,positionAt} from '../map/geometry.ts';
import type {Route} from '../map/geometry.ts';
/**
 * Illustrated landscape composition. A few authored habitats, not a random scatter:
 * each element belongs to a grove, field, riverside or farmyard.
 * All coordinates are decorative; the exact journey route stays untouched.
 */
type Point={x:number;y:number};
type Placed={x:number;y:number;radius:number;kind:string};
type Decoration={y:number;html:string};
type Feature={x:number;y:number;radius:number};
export type Composition={terrain:string;decorations:Decoration[];seasonal:string;placed:Placed[]};
const n=(x:number)=>x.toFixed(1);
const hash=(a:number,b:number,c:number)=>{let v=Math.imul(a+11939,747796405)^Math.imul(b+7919,289133645)^Math.imul(c+17,277803737);v=Math.imul(v^(v>>>16),2246822519);return ((v^(v>>>13))>>>0)/4294967296;};
const groves:{biome:string;x:number;y:number;count:number;radius:number}[]=[
 {biome:'bocage',x:245,y:480,count:7,radius:130},{biome:'bocage',x:570,y:640,count:8,radius:142},
 {biome:'bocage',x:1040,y:300,count:7,radius:120},{biome:'bocage',x:1350,y:620,count:8,radius:160},
 {biome:'bocage',x:540,y:1100,count:6,radius:120},{biome:'bocage',x:1000,y:1280,count:7,radius:140},
 {biome:'bocage',x:380,y:2100,count:7,radius:135},{biome:'bocage',x:1090,y:2250,count:6,radius:145},
 {biome:'valley',x:1700,y:360,count:10,radius:170},{biome:'valley',x:1960,y:830,count:9,radius:165},
 {biome:'valley',x:2050,y:1500,count:10,radius:185},{biome:'valley',x:2340,y:2040,count:12,radius:180},
 {biome:'valley',x:2700,y:2350,count:7,radius:130},{biome:'valley',x:1530,y:2270,count:9,radius:155},
 {biome:'forest',x:2650,y:300,count:22,radius:225},{biome:'forest',x:3020,y:340,count:20,radius:180},
 {biome:'forest',x:2760,y:770,count:21,radius:220},{biome:'forest',x:3270,y:700,count:19,radius:200},
 {biome:'forest',x:2900,y:1090,count:24,radius:210},{biome:'forest',x:3550,y:1120,count:22,radius:210},
 {biome:'forest',x:2550,y:1620,count:22,radius:230},{biome:'forest',x:3080,y:1750,count:26,radius:250},
 {biome:'forest',x:3420,y:2150,count:23,radius:240},{biome:'forest',x:2780,y:2180,count:22,radius:200},
 {biome:'forest',x:3820,y:1770,count:19,radius:180},{biome:'forest',x:3800,y:400,count:17,radius:195},
 {biome:'hills',x:4190,y:270,count:12,radius:190},{biome:'hills',x:4450,y:440,count:9,radius:150},
 {biome:'hills',x:4120,y:960,count:8,radius:170},{biome:'hills',x:4670,y:1180,count:8,radius:135},
 {biome:'hills',x:4050,y:1450,count:12,radius:190},{biome:'hills',x:4550,y:1910,count:13,radius:200},
 {biome:'hills',x:4130,y:2300,count:12,radius:170}
];
const farmCandidates:Point[]=[{x:700,y:580},{x:1250,y:1450},{x:2830,y:640},{x:4070,y:1930},{x:650,y:2320}];
const ground=(x:number,y:number,rx:number,ry:number)=>`<ellipse cx="${n(x+7)}" cy="${n(y+19)}" rx="${n(rx)}" ry="${n(ry)}" fill="#465544" opacity=".09"/>`;
const use=(id:string,x:number,y:number,scale:number,kind:string)=>`<use href="#${id}" data-scenery="${kind}" transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})"/>`;
const seasonalDetail=(id:string,x:number,y:number,size=1)=>`<use href="#${id}" transform="translate(${n(x)} ${n(y)}) scale(${n(size)})"/>`;
export function composeScenery(route:Route,river:Route,features:Feature[]):Composition {
 const decorations:Decoration[]=[],placed:Placed[]=[];
 const farms=farmCandidates.map(f=>{
  for(const [dx,dy] of [[0,0],[185,-160],[-185,-160],[190,180],[-190,180],[290,0],[-290,0],[0,260],[0,-260]]){
   const p={x:f.x+dx,y:f.y+dy};
   if(p.x<160||p.y<160||p.x>route.width-160||p.y>route.height-160)continue;
   if(distanceFromRoute(route,p)<175||distanceFromRoute(river,p)<177)continue;
   if(features.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<v.radius+145))continue;
   return p;
  }
  return null;
 }).filter((p):p is Point=>p!==null);
 const clear=(p:Point,radius:number,avoidScenery=true)=>{
  if(p.x<radius+25||p.y<radius+25||p.x>route.width-radius-25||p.y>route.height-radius-25)return false;
  if(distanceFromRoute(route,p)<radius+63||distanceFromRoute(river,p)<radius+66)return false;
  if(features.some(f=>Math.hypot(f.x-p.x,f.y-p.y)<f.radius+radius+42))return false;
  if(farms.some(f=>Math.hypot(f.x-p.x,f.y-p.y)<radius+115))return false;
  if(avoidScenery&&placed.some(f=>Math.hypot(f.x-p.x,f.y-p.y)<(f.radius+radius)*.74))return false;
  return true;
 };
 // One orchard, not two unrelated rows of trees.
 const orchard={x:620,y:390};
 const orchardTrees:Decoration[]=[];
 for(let row=0;row<4;row++)for(let col=0;col<5;col++){
  const x=orchard.x+col*57+row*8,y=orchard.y+row*53;
  if(clear({x,y},30,false))orchardTrees.push({y,html:use('fruit',x,y,.77,'orchard-tree')});
 }
 if(orchardTrees.length){decorations.push({y:orchard.y,html:`<path d="M535 330L960 370L933 670L522 620Z" fill="#c6cd8a" opacity=".19"/>`});decorations.push(...orchardTrees);}
 // Repeating a few well-chosen grove compositions yields purposeful forests.
 groves.forEach((grove,g)=>{
  const trees:Placed[]=[];
  for(let j=0;j<grove.count;j++){
   const a=Math.PI*2*hash(g,j,1),distance=grove.radius*Math.sqrt(hash(g,j,2))*.96;
   const x=grove.x+Math.cos(a)*distance,y=grove.y+Math.sin(a)*distance*.75;
   const scale=.76+.38*hash(g,j,3),radius=31*scale;
   if(!clear({x,y},radius))continue;
   const kind=grove.biome==='forest'
     ?(hash(g,j,4)<.56?'fir':hash(g,j,5)<.65?'oak':'maple')
     :grove.biome==='valley'?(hash(g,j,4)<.38?'birch':'oak')
     :grove.biome==='hills'?(hash(g,j,4)<.7?'fir':'birch')
     :(hash(g,j,4)<.25?'fruit':hash(g,j,5)<.46?'maple':'oak');
   placed.push({x,y,radius,kind:grove.biome});trees.push({x,y,radius,kind});
   decorations.push({y,html:use(kind,x,y,scale,grove.biome==='forest'?'forest':grove.biome+'-tree')});
  }
  if(trees.length>=4){
   // Ground shading is behind the whole grove, not under each tree as a floating badge.
   const minX=Math.min(...trees.map(t=>t.x)),maxX=Math.max(...trees.map(t=>t.x));
   const minY=Math.min(...trees.map(t=>t.y)),maxY=Math.max(...trees.map(t=>t.y));
   decorations.push({y:minY-1000,html:`<ellipse cx="${n((minX+maxX)/2)}" cy="${n((minY+maxY)/2+14)}" rx="${n((maxX-minX)/2+65)}" ry="${n((maxY-minY)/2+43)}" fill="var(--season-meadow,#9fb67d)" opacity=".19"/>`});
  }
 });
 // Farmyards are micro-scenes: building + driveway + enclosure + context.
 for(const [i,f] of farms.entries()){
  // Every farm is chosen outside both the road and the river beforehand.
  const x=f.x,y=f.y;
  const markup=`<g class="farmstead" data-scenery="farmstead" transform="translate(${x} ${y})">
    <ellipse cx="12" cy="36" rx="142" ry="103" fill="#596743" opacity=".16"/>
    <path d="M-120 63Q-65 15 0 70T136 60" fill="none" stroke="#d6c39b" stroke-width="20" stroke-linecap="round"/>
    <path d="M-124 -8L-124 75L120 75L120 -10" fill="none" stroke="#a69269" stroke-width="5" stroke-dasharray="19 9"/>
    <use href="#farm" x="-13" y="-12"/>
    <use href="#barn" x="90" y="-38"/>
    <use href="#oak" transform="translate(-103 -54) scale(.78)"/>
    <use href="#fruit" transform="translate(115 72) scale(.65)"/>
    <g class="courtyard-ground">${ground(-15,60,48,16)}${ground(90,31,44,16)}</g>
    <path d="M-88 66l20-8 21 8M34 77l20-6 17 8" stroke="#867e51" stroke-width="3" fill="none"/>
  </g>`;
  decorations.push({y,html:markup});
 }
 // Agricultural plots remain distinct from woods. Field edges and hedge rows
 // convey planting, drainage and scale rather than isolated symbols.
 const terrain=`<g class="land-habitats">
   <path d="M-120 450Q410 190 1150 320T1720 740L1380 1280Q640 1040-120 1450Z" fill="#d5d49f" opacity=".18"/>
   <path d="M1380 -120Q1940 170 2150 700T2540 1510Q2140 2040 1480 2350L1250 1730Q1800 1270 1520 660Z" fill="#88ad98" opacity=".12"/>
   <path d="M2440 30Q3100 240 3630-50L3950 350L3790 1270L3580 2410L2840 2630Q2790 1900 2450 1500Z" fill="#486f56" opacity=".17"/>
   <path d="M3770 60Q4170 140 4820-120V2700Q4140 2420 3790 1900Q4220 1250 3770 60Z" fill="#d6c69d" opacity=".15"/>
   <path d="M115 1850Q520 1760 790 1990L900 2400Q600 2600 50 2520Z" fill="#d6c38f" opacity=".12"/>
  </g>`;
 const seasonalItems:{[key:string]:string[]}={spring:[],summer:[],autumn:[],winter:[]};
 // Seasonal props belong to the courtyard, not to random points on the map.
 farms.forEach((farm,i)=>{
  const x=farm.x,y=farm.y;
  seasonalItems.autumn.push(seasonalDetail('pumpkin',x-76,y+56,1.15),seasonalDetail('pumpkin',x-48,y+77,.72),seasonalDetail('fallen-leaf',x+32,y+63,1.1));
  seasonalItems.winter.push(seasonalDetail('snow-drift',x-52,y+52,1.1),seasonalDetail('snow-drift',x+76,y+44,.8),seasonalDetail('winter-twig',x-91,y+64,.85));
  seasonalItems.spring.push(seasonalDetail('flower-clump',x-81,y+66,1.1),seasonalDetail('blossom-petal',x+43,y+73,.9),seasonalDetail('flower-clump',x+83,y+67,.8));
  seasonalItems.summer.push(seasonalDetail('hay-bale',x-76,y+61,1),seasonalDetail('hay-bale',x-45,y+80,.7),seasonalDetail('wildflower',x+83,y+59,1));
 });
 // Detail vignettes are attached to existing landuses. No decorations in
 // the river, on the road, or on top of the milestone markers.
 const motifs=[...farms,{x:685,y:890},{x:1010,y:2140},{x:2850,y:2130},{x:4200,y:890},{x:3340,y:360}];
 for(const [i,spot] of motifs.entries()){
  for(let j=0;j<5;j++){
   const x=spot.x+(hash(i,j,7)-.5)*235,y=spot.y+(hash(i,j,8)-.5)*185;
   if(!clear({x,y},13,false))continue;
   const scale=.64+hash(i,j,9)*.38;
   seasonalItems.autumn.push(seasonalDetail(j%3===0?'pumpkin':'fallen-leaf',x,y,scale));
   seasonalItems.winter.push(seasonalDetail(j%3===0?'snow-drift':'winter-twig',x,y,scale));
   seasonalItems.spring.push(seasonalDetail(j%3===0?'flower-clump':'blossom-petal',x,y,scale));
   seasonalItems.summer.push(seasonalDetail(j%3===0?'hay-bale':'wildflower',x,y,scale));
  }
 }
 // Forest floor details take their cue from the habitat, rather than
 // distributing pumpkins / snow on unrelated landuse.
 placed.filter(p=>p.kind==='forest').filter((_,i)=>i%7===0).forEach((p,i)=>{
  const x=p.x+41,y=p.y+35;
  if(!clear({x,y},10,false))return;
  seasonalItems.autumn.push(seasonalDetail(i%2?'mushrooms':'fallen-leaf',x,y,.9));
  seasonalItems.winter.push(seasonalDetail('snow-drift',x,y,.55));
  seasonalItems.spring.push(seasonalDetail('flower-clump',x,y,.75));
  seasonalItems.summer.push(seasonalDetail('wildflower',x,y,.78));
 });
 const seasonal=Object.entries(seasonalItems).map(([season,parts])=>`<g class="seasonal-vignettes" data-season-detail="${season}" display="none">${parts.join('')}</g>`).join('');
 return {terrain,decorations,seasonal,placed};
}
