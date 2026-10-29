/** Cosmetic seasons only. Meteorological northern-hemisphere boundaries, version 1. */
export type Season = 'spring'|'summer'|'autumn'|'winter';
export function seasonAt(instant:Date,timeZone='Europe/Brussels'):Season {
  if(!Number.isFinite(instant.getTime()))throw new Error('Invalid season instant');
  const month=Number(new Intl.DateTimeFormat('en',{timeZone,month:'numeric'}).format(instant));
  return month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';
}
export const seasonThemes:Record<Season,{label:string;colors:readonly string[]}>= {
 spring:{label:'Printemps',colors:['#bed59e','#cfdfad','#afc88d','#bbce83','#90b16b','#628b57','#f3c5d5','#c7d99d','#99bb83','#b3cea0','#e0dcad','#b6c5a0']},
 summer:{label:'Été',colors:['#b2c68d','#b9c99a','#a9bb88','#a6b86b','#79974f','#4c7349','#b46641','#9fb67d','#496b50','#809664','#cbbb7a','#a6ad84']},
 autumn:{label:'Automne',colors:['#c7bd87','#d1c495','#b8b580','#e4b15d','#c68b49','#936742','#b34e35','#b5a571','#586e51','#9a9c65','#d1af6d','#aaa58b']},
 winter:{label:'Hiver',colors:['#d9e3dc','#e6eae0','#c8d5ce','#e0e7de','#bdcfc4','#91aaa0','#e7ece5','#c4d2c7','#6e8b81','#ceddd3','#d8dccc','#b7c5c0']},
};
const properties=['land-a','land-b','land-c','leaf-a','leaf-b','leaf-c','fruit','meadow','fir-dark','fir-light','crop','rock'];
/** Only decorative paint changes: no DOM replacement, route mutation or camera movement. */
export function applySeason(world:SVGGElement,season:Season){
 const theme=seasonThemes[season];
 properties.forEach((name,i)=>world.style.setProperty(`--season-${name}`,theme.colors[i]));
 world.dataset.season=season;
}
