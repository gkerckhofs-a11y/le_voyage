import { createRoute, distanceFromRoute, positionAt } from '../map/geometry.ts';
import {composeScenery} from './scenery-composition.ts';
import type { Route } from '../map/geometry.ts';

export const landscapeRiver = createRoute('river',4800,2600,[[1860,-160],[1910,310],[2270,600],[2280,1080],[2420,1460],[2210,1940],[2520,2430],[2440,2760]].map(([x,y])=>({x,y})));

/** Scenic anchors follow route progress, independently of campaign time or reward thresholds. */
export function scenicFeatures(route:Route){
 const result:{kind:string;ratio:number;x:number;y:number;radius:number}[]=[];
 const plans:[string,number,number][]=[['hamlet',.08,110],['orchard',.19,100],['sheep',.12,45],['sheep',.22,45],['hamlet',.39,110],['castle',.67,130],['deer',.57,45],['deer',.72,45],['hill',.79,150],['hill',.85,150],['hill',.93,150],['sheep',.89,45]];
 for(const [kind,ratio,radius] of plans){
  const p=positionAt(route,ratio),a=p.angle*Math.PI/180;
  for(const offset of [radius+105,-radius-105,radius+190,-radius-190,radius+270,-radius-270]){
   const x=p.x-Math.sin(a)*offset,y=p.y+Math.cos(a)*offset;
   if(x<radius||y<radius||x>route.width-radius||y>route.height-radius||distanceFromRoute(route,{x,y})<radius+45||distanceFromRoute(landscapeRiver,{x,y})<radius+80||result.some(f=>Math.hypot(f.x-x,f.y-y)<f.radius+radius+25))continue;
   result.push({kind,ratio,x,y,radius});break;
  }
 }
 return result;
}
function scenicMarkup(f:ReturnType<typeof scenicFeatures>[number]){
 const sheep='<ellipse rx="15" ry="10" fill="#faf1d7" stroke="#8c8a72" stroke-width="2"/><ellipse cx="17" rx="6" ry="5" fill="#696751"/>';
 const house=(x:number,y:number,angle:number)=>`<g transform="translate(${x} ${y}) rotate(${angle})"><ellipse cx="8" cy="22" rx="43" ry="25" fill="#3d513b" opacity=".17"/><path d="M-31-15V19L5 35V0Z" fill="#e9d9b7" stroke="#9a856a" stroke-width="2.5"/><path d="M5 0L35-15V18L5 35Z" fill="#cbbb9b" stroke="#907c61" stroke-width="2.5"/><path d="M-38-16L-7-41L40-20L6 4Z" fill="#8a6954" stroke="#665147" stroke-width="3"/><path d="M-15 7L-4 11V24L-15 20Z" fill="#64817f" stroke="#e7ddc3" stroke-width="2"/><path d="M12 8L23 2V16L12 22Z" fill="#688382" stroke="#f3e6c5" stroke-width="2"/><path d="M15-24V-45H23V-19" fill="#ae947b"/></g>`;
 const art=f.kind==='hill'?'<ellipse rx="145" ry="105" fill="var(--season-meadow,#9fb67d)" stroke="#81956a" stroke-width="3"/><path d="M-127 16C-103-86 105-96 127 6M-109 30C-82-64 82-73 109 16M-85 38C-62-39 62-52 85 24M-55 43C-38-17 37-30 55 30" fill="none" stroke="#e1dfb3" stroke-width="4" opacity=".7"/><ellipse cx="18" cy="-18" rx="29" ry="16" fill="#c3cc9a"/>':
 f.kind==='hamlet'?`<path d="M-100 55Q0 5 100 70" fill="none" stroke="#d9c99d" stroke-width="18"/>${house(-55,-33,-12)}${house(48,-20,15)}${house(0,65,-5)}`:
 f.kind==='castle'?'<rect x="-105" y="-85" width="210" height="170" rx="20" fill="#536c3930"/><rect x="-88" y="-72" width="176" height="144" fill="#c1b99b" stroke="#7f8376" stroke-width="10"/><rect x="-52" y="-37" width="104" height="84" fill="#d7c9a6"/><path d="M-74-62H74V-38H-74Z" fill="#5b6c6b"/><path d="M-45 76H45V108H-45" fill="#c6b18d"/><g fill="#596c6a" stroke="#d8d3b9" stroke-width="6"><circle cx="-86" cy="-70" r="27"/><circle cx="86" cy="-70" r="27"/><circle cx="-86" cy="70" r="27"/><circle cx="86" cy="70" r="27"/></g><g fill="#e2d6b2"><circle cx="-86" cy="-70" r="6"/><circle cx="86" cy="-70" r="6"/><circle cx="-86" cy="70" r="6"/><circle cx="86" cy="70" r="6"/></g>':
 f.kind==='orchard'?Array.from({length:9},(_,i)=>`<use href="#fruit" x="${(i%3-1)*55}" y="${(Math.floor(i/3)-1)*55}"/>`).join(''):
 f.kind==='deer'?'<ellipse rx="21" ry="11" fill="#ac7950"/><path d="M-14 6L-24 16M8 7L14 17M19-3L27-15" stroke="#745338" stroke-width="5"/><ellipse cx="28" cy="-15" rx="9" ry="5" fill="#b8875a"/><path d="M30-19L28-30M28-25L21-29M28-27L34-32" fill="none" stroke="#745338" stroke-width="2"/>':`<g transform="translate(-17 -18)">${sheep}</g><g transform="translate(12 12) rotate(30)">${sheep}</g>`;
 return `<g class="scenic-feature" data-scenery="${f.kind}" data-route-ratio="${f.ratio}" transform="translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})">${art}</g>`;
}

/** Original, deterministic vector illustration. No remote graphics or geographical data. */
export function landscape(route: Route): string {
  const river=landscapeRiver;
  const features=scenicFeatures(route);
  const composition=composeScenery(route,river,features);
  const bridges: {x:number;y:number;angle:number}[]=[];
  for(let i=1;i<route.samples.length;i++) {
    const a=route.samples[i-1],b=route.samples[i];
    for(let j=1;j<river.samples.length;j++){
      const c=river.samples[j-1],d=river.samples[j],rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;
      if(Math.abs(den)<.001)continue;
      const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/den,u=((c.x-a.x)*ry-(c.y-a.y)*rx)/den;
      if(t<0||t>1||u<0||u>1)continue;
      const x=a.x+t*rx,y=a.y+t*ry;
      if(bridges.some(p=>Math.hypot(x-p.x,y-p.y)<120))continue;
      bridges.push({x,y,angle:Math.atan2(ry,rx)*180/Math.PI});
    }
  }
  const bridgeMarkup = bridges.map(b=>`<g transform="translate(${b.x} ${b.y}) rotate(${b.angle})"><rect x="-95" y="-45" width="190" height="90" rx="8" fill="#637460" opacity=".3" transform="translate(8 9)"/><rect x="-93" y="-39" width="186" height="78" rx="4" fill="url(#stone)"/><path d="M-92 -40H92 M-92 40H92" stroke="#d0cbb0" stroke-width="9"/><path d="M-92 -45H92 M-92 45H92" stroke="#7e8774" stroke-width="3"/></g>`).join('');
  return `<defs>
    <linearGradient id="land" x2="1" y2="1"><stop stop-color="var(--season-land-a,#b2c68d)"/><stop offset=".5" stop-color="var(--season-land-b,#b9c99a)"/><stop offset="1" stop-color="var(--season-land-c,#a9bb88)"/></linearGradient>
    <radialGradient id="leaf"><stop stop-color="var(--season-leaf-a,#a6b86b)"/><stop offset=".65" stop-color="var(--season-leaf-b,#79974f)"/><stop offset="1" stop-color="var(--season-leaf-c,#4c7349)"/></radialGradient>
    <radialGradient id="autumn"><stop stop-color="#d8bc62"/><stop offset="1" stop-color="#82934e"/></radialGradient>
    <linearGradient id="water" x2="1" y2="1"><stop stop-color="#87b7b4"/><stop offset=".5" stop-color="#6a9fa5"/><stop offset="1" stop-color="#88baba"/></linearGradient>
    <pattern id="paper" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M3 9l3-1M23 54l2 1M48 20l4-1M73 67l3 1" stroke="#455a38" stroke-width="1.5" opacity=".13"/><circle cx="37" cy="36" r="1" fill="#f9f0cf" opacity=".55"/></pattern>
    <pattern id="crops" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><rect width="22" height="22" fill="var(--season-crop,#cbbb7a)"/><path d="M0 0V22" stroke="#e0ce8b" stroke-width="12"/><path d="M16 0V22" stroke="#9eaa67" stroke-width="2"/></pattern>
    <pattern id="stone" width="30" height="20" patternUnits="userSpaceOnUse"><rect width="30" height="20" fill="#b8b29b"/><path d="M0 0H30M0 10H30M15 0V10M0 10V20M30 10V20" stroke="#8c927d" stroke-width="2"/></pattern>
    <g id="maple">
      <ellipse cx="12" cy="25" rx="33" ry="22" fill="#304934" opacity=".21"/>
      <path d="M0 4L4 31" stroke="#65533c" stroke-width="7"/>
      <path d="M-27-10Q-40-31-15-39Q-8-59 10-47Q33-53 35-30Q53-8 28 8Q12 27-7 16Q-36 20-33 1Z" fill="var(--season-leaf-b,#79974f)" stroke="#725e44" stroke-width="2" opacity="var(--season-canopy-opacity,1)"/>
      <path d="M-15-26Q0-47 16-30M-22-6Q2 1 24-11" stroke="#f5d8a0" stroke-width="4" opacity=".45" fill="none"/>
    </g>
    <g id="birch">
      <ellipse cx="12" cy="28" rx="24" ry="18" fill="#304934" opacity=".15"/>
      <path d="M0-18L2 31" stroke="#e9e4d5" stroke-width="7"/>
      <path d="M-2-11L6-2M0 9L-5 14" stroke="#666c61" stroke-width="3"/>
      <g fill="var(--season-leaf-a,#a6b86b)" stroke="#6f8756" stroke-width="2" opacity="var(--season-canopy-opacity,1)"><ellipse cy="-35" rx="22" ry="29"/><ellipse cx="-16" cy="-19" rx="18" ry="19"/><ellipse cx="16" cy="-22" rx="19" ry="21"/></g>
    </g>
    <g id="pumpkin">
      <ellipse cy="8" rx="16" ry="5" fill="#69563b" opacity=".2"/>
      <g fill="#d88637" stroke="#a95b31" stroke-width="1.5"><ellipse rx="11" ry="9"/><ellipse cx="-5" rx="6" ry="9"/><ellipse cx="5" rx="6" ry="9"/></g>
      <path d="M0-8Q1-15 7-14" fill="none" stroke="#64824c" stroke-width="3"/>
    </g>
    <g id="fallen-leaf">
      <ellipse cy="3" rx="15" ry="4" fill="#665a3e" opacity=".11"/>
      <path d="M-11 0Q-15-9-4-8Q-3-16 3-10Q14-15 12-3L4 5L-2 1Z" fill="#bb6c36" stroke="#95613d" stroke-width="1"/>
      <path d="M-1 2L13 11" stroke="#80583e" stroke-width="1.7"/>
    </g>
    <g id="mushrooms">
      <ellipse cy="5" rx="18" ry="5" fill="#514d34" opacity=".13"/>
      <path d="M-7-5V5M10-7V5" stroke="#f2ddbe" stroke-width="5"/>
      <path d="M-18-6Q-7-25 5-6ZM2-7Q12-23 22-7Z" fill="#b45b3f" stroke="#f7dbc1" stroke-width="1.5"/>
      <g fill="#fff1cd"><circle cx="-7" cy="-11" r="2.5"/><circle cx="10" cy="-12" r="2"/></g>
    </g>
    <g id="snow-drift">
      <ellipse cy="5" rx="28" ry="9" fill="#7a9da0" opacity=".16"/>
      <path d="M-30 4Q-19-16-8-8Q2-25 14-11Q25-17 32 5Z" fill="#f1f5f0" stroke="#c4d5d2" stroke-width="2"/>
    </g>
    <g id="winter-twig">
      <ellipse cy="4" rx="14" ry="5" fill="#7a9da0" opacity=".12"/>
      <path d="M0 6V-23M0-10L-13-23M0-5L12-21M0-15L6-27" stroke="#756b56" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
    <g id="flower-clump">
      <ellipse cy="4" rx="13" ry="5" fill="#657c4e" opacity=".13"/>
      <path d="M-9 4L-9-8M0 4L0-14M10 4L10-8" stroke="#63824d" stroke-width="2"/>
      <g fill="#f3d9e3" stroke="#d9a4ba" stroke-width="1.5"><circle cx="-9" cy="-10" r="5"/><circle cy="-15" r="6"/><circle cx="10" cy="-10" r="5"/></g>
      <g fill="#ecd179"><circle cx="-9" cy="-10" r="2"/><circle cy="-15" r="2"/><circle cx="10" cy="-10" r="2"/></g>
    </g>
    <g id="blossom-petal">
      <ellipse cy="4" rx="14" ry="4" fill="#60794f" opacity=".1"/>
      <path d="M-6 0Q-15-9-6-12Q1-17 5-5Q12-12 15-4Q15 5 5 5Z" fill="#f2cbd6" stroke="#d9b0ba" stroke-width="1"/>
    </g>
    <g id="hay-bale">
      <ellipse cy="6" rx="22" ry="8" fill="#61553c" opacity=".19"/>
      <rect x="-18" y="-15" width="36" height="22" rx="8" fill="#d9b36a" stroke="#ab854f" stroke-width="2"/>
      <path d="M-7-13V5M8-13V5M-18-4H18" stroke="#f1d491" stroke-width="2"/>
    </g>
    <g id="wildflower">
      <ellipse cy="7" rx="12" ry="5" fill="#60794f" opacity=".12"/>
      <path d="M-8 5L-6-10M1 5L1-12M9 5L7-9" stroke="#678d4b" stroke-width="2"/>
      <g fill="#f9e5a5"><circle cx="-6" cy="-10" r="4"/><circle cx="1" cy="-12" r="4"/><circle cx="7" cy="-9" r="4"/></g>
    </g>
    <g id="oak"><ellipse cx="10" cy="18" rx="35" ry="27" fill="#385638" opacity=".18"/><path d="M-2 12L2 29" stroke="#655b3b" stroke-width="8"/><path d="M-28 7L-13-11L-3-30M-1-3L19-23M5 4L25-4" fill="none" stroke="#766249" stroke-width="5" stroke-linecap="round"/><path d="M-32 1C-45-17-27-27-22-28C-27-48-1-52 8-40C31-47 39-26 32-17C47-6 34 17 18 14C5 30-18 23-22 14C-32 17-42 10-32 1" fill="url(#leaf)" stroke="#5e7c48" stroke-width="2" opacity="var(--season-canopy-opacity,1)"/><path d="M-22-22Q-13-38 4-30M6-13Q19-23 27-12M-17 1Q-2 7 4-4" fill="none" stroke="#c0c885" stroke-width="5" opacity=".45" stroke-linecap="round"/></g>
    <g id="fir"><ellipse cx="9" cy="21" rx="29" ry="21" fill="#324f3d" opacity=".2"/><path d="M0 0V31" stroke="#6e6548" stroke-width="8"/><path d="M0-61L21-24L11-27L29 1L16-3L35 22Q0 37-33 22L-17-3L-29 2L-11-27L-21-24Z" fill="var(--season-fir-dark,#496b50)" stroke="#3b6048" stroke-width="2"/><path d="M0-52L-14-24L-4-27L-21 2L-6-3L-23 22L0 18Z" fill="var(--season-fir-light,#809664)"/><path d="M1-39L1 19" stroke="#a7b77c" stroke-width="2" opacity=".35"/><path d="M0-58L14-32L6-35L19-12L5-17L16 6L0-1L-16 6L-4-17L-19-12L-6-35L-14-32Z" fill="#f5f7ef" opacity="var(--season-snow-opacity,0)"/></g>
    <g id="fruit"><use href="#oak" transform="scale(.7)"/><g fill="var(--season-fruit,#b46641)" opacity="var(--season-fruit-opacity,1)"><circle cx="-12" cy="-13" r="3"/><circle cx="10" cy="-19" r="3"/><circle cx="5" cy="6" r="3"/></g></g>
    <g id="farm">
      <ellipse cx="14" cy="48" rx="87" ry="48" fill="#374e3e" opacity=".18"/>
      <path d="M-51-14L-5-38L57-14L10 10Z" fill="#635c4e" stroke="#514b43" stroke-width="3"/>
      <path d="M-51-14V36L10 59V10Z" fill="#e8d7b5" stroke="#927f64" stroke-width="2.5"/>
      <path d="M10 10L57-14V35L10 59Z" fill="#c9b897" stroke="#8f7b5e" stroke-width="2.5"/>
      <path d="M-60-15L-5-49L66-19L10 13Z" fill="#89725e" stroke="#654f44" stroke-width="3"/>
      <path d="M-51-14L-5-40L57-17L10 10Z" fill="#9b866d"/>
      <path d="M-31 12L-13 19V36L-31 29Z" fill="#5b7977" stroke="#efe2bf" stroke-width="3"/>
      <path d="M25 20L43 10V29L25 39Z" fill="#678580" stroke="#efe2bf" stroke-width="3"/>
      <path d="M-5 57V23L8 28V59" fill="#6f6b55" stroke="#4f5744" stroke-width="2"/>
      <path d="M22-20V-55H33V-15" fill="#a78b73" stroke="#736354" stroke-width="2"/>
      <path d="M23-55H34" stroke="#5e5144" stroke-width="4"/>
    </g>
    <g id="barn">
      <ellipse cx="5" cy="35" rx="63" ry="31" fill="#374e3e" opacity=".16"/>
      <path d="M-39-8V30L2 47V9Z" fill="#bd996f" stroke="#85684d" stroke-width="2"/>
      <path d="M2 9L43-8V29L2 47Z" fill="#a58062" stroke="#85684d" stroke-width="2"/>
      <path d="M-46-10L-13-38L48-15L6 14Z" fill="#9d6350" stroke="#785146" stroke-width="3"/>
      <path d="M-31-11L-8-27L34-13L6 6Z" fill="#be8262"/>
      <path d="M-20 15L-3 21V44L-20 38Z" fill="#6e604a"/>
      <path d="M-18 19L-3 40M-3 22L-19 39" stroke="#b79c70" stroke-width="2"/>
    </g>
  </defs>
  <g class="landscape" aria-hidden="true">
  <rect x="-500" y="-500" width="5800" height="3600" fill="url(#land)"/>
  ${composition.terrain}
  <g fill="var(--season-meadow,#9fb67d)" opacity=".58"><path d="M-100 500Q300 100 1000 270T1700 160L1800-200H-100Z"/><path d="M-200 2050Q350 1630 900 1850T1700 2150L1400 2800H-200Z"/><path d="M2900-100Q3400 480 3240 1100T3600 2200L3950 2750H3000Q2780 1700 2900 1100T2600-100Z"/></g>
  <g fill="none" stroke="#dbe1ae" stroke-width="3" opacity=".35"><path d="M-70 400Q540 100 1000 230T1650 50M-70 435Q540 135 1000 265T1650 85M-70 470Q540 170 1000 300T1650 120"/><path d="M3830 1590Q4110 1450 4440 1800T4900 2200M3820 1640Q4110 1500 4430 1850T4900 2250M3810 1690Q4110 1550 4420 1900T4900 2300"/></g>
  <g stroke="#9da873" stroke-width="9"><path d="M80 60L520 90L610 410L170 550L20 310Z" fill="url(#crops)"/><path d="M780 60L1040 100L920 450L750 400Z" fill="#d1c789"/><path d="M350 1690L600 1670L665 1880L300 1920Z" fill="url(#crops)"/><path d="M780 2150L1250 2000L1390 2380L1020 2520L740 2430Z" fill="url(#crops)"/><path d="M2740 170L3100 100L3230 570L2790 450Z" fill="url(#crops)"/><path d="M3990 2150L4210 2100L4360 2440L3980 2510Z" fill="#cfbc79"/></g>
  <g fill="var(--season-rock,#a6ad84)" stroke="#889a77" stroke-width="4"><path d="M4050 110L4380 70L4630 280L4560 425L4290 280Z"/><path d="M4055 122L4270 300L4350 330L4380 460L4530 467L4560 425L4290 280Z" fill="#84967e"/><path d="M3850 1500L4070 1580L4230 1840L4130 1970L3930 1760Z"/><path d="M3850 1500L3855 1630L3910 1840L4100 2080L4130 1970L3930 1760Z" fill="#81927a"/></g>
  <path d="${river.path}" stroke="#8fa685" stroke-width="143" fill="none"/><path d="${river.path}" stroke="#c8c89f" stroke-width="123" fill="none"/><path d="${river.path}" stroke="url(#water)" stroke-width="99" fill="none"/>
  <path d="${river.path}" stroke="#cae0d2" stroke-width="2" stroke-dasharray="35 46 13 98" fill="none" opacity=".7"/>
  <g class="map-details">${[...composition.decorations,...features.map(f=>({y:f.y,html:scenicMarkup(f)}))].sort((a,b)=>a.y-b.y).map(d=>d.html).join('')}${composition.seasonal}</g>
  <rect x="0" y="0" width="4800" height="2600" fill="url(#paper)" pointer-events="none"/>
  ${bridgeMarkup}
  </g>`;
}

export function carMarkup(color:string): string {
  return `<g class="car-art" style="--car-color:${color}">
    <ellipse cx="8" cy="9" rx="36" ry="54" fill="#263d30" opacity=".25"/>
    <g fill="#28372e" stroke="#14251e" stroke-width="2"><rect x="-35" y="-31" width="12" height="23" rx="5"/><rect x="23" y="-31" width="12" height="23" rx="5"/><rect x="-35" y="21" width="12" height="24" rx="5"/><rect x="23" y="21" width="12" height="24" rx="5"/></g>
    <path d="M-25 43Q-32 30-30-13L-27-39Q-25-53 0-55Q25-53 27-39L30-13Q32 30 25 43Q0 55-25 43Z" fill="var(--car-color)" stroke="#773329" stroke-width="2.5"/>
    <path d="M-24-20Q0-31 24-20L20-3Q0-9-20-3Z" fill="#456967" stroke="#ebcfab" stroke-width="2"/>
    <path d="M-20 28Q0 35 20 28L19 17Q0 22-19 17Z" fill="#426564" stroke="#ebcfab" stroke-width="2"/>
    <path d="M-20-3Q0-10 20-3L19 17Q0 23-19 17Z" fill="#e2cc94" stroke="#8a5a3e" stroke-width="2"/>
    <path d="M-17-1H17M-17 15H17M-9-3V19M9-3V19" stroke="#ad865c" stroke-width="2"/>
    <path d="M-22-39Q0-48 22-39M-24 40Q0 46 24 40" fill="none" stroke="#f3deb7" stroke-width="4" stroke-linecap="round"/>
    <path d="M-19-35Q0-41 19-35" fill="none" stroke="#e18b61" stroke-width="5" opacity=".7"/>
    <ellipse cx="-20" cy="-44" rx="6" ry="5" fill="#fff2bf" stroke="#e1c39a" stroke-width="2"/><ellipse cx="20" cy="-44" rx="6" ry="5" fill="#fff2bf" stroke="#e1c39a" stroke-width="2"/>
    <path d="M-29-8L-36-10M29-8L36-10" stroke="#e8d9b7" stroke-width="4" stroke-linecap="round"/>
    <path d="M-25-13L-23 25" stroke="#ed9872" stroke-width="3" opacity=".7"/>
  </g>`;
}

/** Original top-down retro minibus. Shares the car's origin and forward (-Y) axis. */
export function minibusMarkup(color:string): string {
  if(!/^#[a-fA-F0-9]{6}$/.test(color))throw new Error('Invalid vehicle color');
  return `<g class="minibus-art" data-vehicle="minibus" style="--bus-color:${color}">
    <ellipse cx="7" cy="8" rx="40" ry="65" fill="#263d30" opacity=".25"/>
    <g fill="#26352f" stroke="#152720" stroke-width="2"><rect x="-39" y="-39" width="12" height="24" rx="5"/><rect x="27" y="-39" width="12" height="24" rx="5"/><rect x="-39" y="30" width="12" height="24" rx="5"/><rect x="27" y="30" width="12" height="24" rx="5"/></g>
    <path d="M-32 45V-44Q-32-63 0-65Q32-63 32-44V45Q32 62 0 63Q-32 62-32 45Z" fill="var(--bus-color)" stroke="#254c4d" stroke-width="3"/>
    <path d="M-31-21V-44Q-31-62 0-63Q31-62 31-44V-21Z" fill="#f3e5c4"/>
    <path d="M-26-44Q-14-53-2-51V-29H-26Z M2-51Q14-53 26-44V-29H2Z" fill="#426e76" stroke="#e8d9b6" stroke-width="2"/>
    <path d="M-21-47L-8-48M8-48L21-44" stroke="#b3d0c5" stroke-width="3" stroke-linecap="round"/>
    <rect x="-21" y="-22" width="42" height="64" rx="12" fill="#f4e7c8" stroke="#d1bf98" stroke-width="2"/>
    <path d="M-12-10V29M0-12V31M12-10V29" stroke="#e0cfaa" stroke-width="2"/>
    <g fill="#426e76" stroke="#e8d9b6" stroke-width="2"><path d="M-28-17H-24V-1H-28Z M24-17H28V-1H24Z M-28 4H-24V20H-28Z M24 4H28V20H24Z M-28 25H-24V39H-28Z M24 25H28V39H24Z"/><path d="M-21 46H21V53Q0 58-21 53Z"/></g>
    <path d="M-26-56Q0-65 26-56M-25 58Q0 65 25 58" stroke="#e9dec3" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g fill="#fff1b8" stroke="#d7bf8f" stroke-width="1.5"><ellipse cx="-22" cy="-55" rx="5" ry="4"/><ellipse cx="22" cy="-55" rx="5" ry="4"/></g>
    <path d="M-31-28H-40M31-28H40" stroke="#e6d8b8" stroke-width="4" stroke-linecap="round"/>
    <path d="M-32-22H32" stroke="#f4e8c9" stroke-width="3"/>
    <circle cy="-58" r="3" fill="#bd6c43"/>
  </g>`;
}
