import { createRoute } from './geometry.ts';
/** Fictional landscape, no geographical coordinates or gift locations. */
export const journeyRoute = createRoute('wallonie-imaginaire-v1', 4800, 2600, [
  [260,2070],[770,2010],[1000,1710],[680,1410],[330,1530],[180,1150],[600,880],[1080,1060],
  [1300,770],[1110,400],[1480,230],[1770,550],[1570,1050],[1950,1260],[2150,950],[2040,650],
  [2390,560],[2630,950],[2540,1420],[2140,1630],[1760,1570],[1540,1840],[1800,2220],[2330,2140],
  [2710,1870],[3000,1930],[3260,2240],[3630,2130],[3700,1790],[3330,1630],[3000,1400],[3100,1100],
  [3450,1020],[3680,1290],[4000,1330],[4210,1030],[4010,680],[3600,630],[3420,330],[3830,200],
  [4250,400],[4490,650],[4530,1150],[4380,1610],[4550,2050]
].map(([x,y]) => ({x,y})));
export const landscapeZones = [
  { id: 'bocage', name: 'Les chemins du bocage', from: 0, to: .25 },
  { id: 'vallee', name: 'Au fil de la rivière', from: .25, to: .5 },
  { id: 'foret', name: 'La forêt des grands détours', from: .5, to: .75 },
  { id: 'collines', name: 'Là-haut, les collines', from: .75, to: 1 }
] as const;
