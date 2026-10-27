import { createRoute, distanceFromRoute, positionAt } from '../map/geometry.ts';
import type { Route } from '../map/geometry.ts';

/** Original, deterministic vector illustration. No remote graphics or geographical data. */
export function landscape(route: Route): string {
  let seed = 28491;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const river = createRoute('river',4800,2600,[[1860,-160],[1910,310],[2270,600],[2280,1080],[2420,1460],[2210,1940],[2520,2430],[2440,2760]].map(([x,y])=>({x,y})));
  const decorations: { y:number; html:string }[] = [];
  for(let i=0;i<760;i++) {
    const x=60+random()*4680, y=70+random()*2460;
    if(distanceFromRoute(route,{x,y})<94 || distanceFromRoute(river,{x,y})<85) continue;
    const scale=.65+random()*.75;
    const symbol=x>2750&&x<3800 ? (random()>.3?'fir':'oak') : random()>.84?'fir':'oak';
    // Leave room for generous meadows and fields, denser woods in the eastern zone.
    if(x<1450 && random()>.48) continue;
    decorations.push({y,html:`<use href="#${symbol}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(2)})"/>`});
  }
  const farms=[[700,580],[1250,1450],[2830,640],[4070,1930],[650,2320]];
  farms.forEach(([x,y])=>decorations.push({y,html:`<g transform="translate(${x} ${y})"><ellipse cx="4" cy="26" rx="116" ry="65" fill="#b2b778"/><path d="M-80 28L100 49" stroke="#d6c398" stroke-width="24"/><use href="#farm"/><use href="#barn" x="90" y="-38" transform="rotate(9 90 -38)"/><use href="#oak" x="-88" y="-60"/><use href="#oak" x="103" y="58"/></g>`}));
  for(let row=0;row<4;row++)for(let col=0;col<5;col++){
    const x=600+col*64+row*14,y=490+row*64;
    if(distanceFromRoute(route,{x,y})>85) decorations.push({y,html:`<use href="#fruit" x="${x}" y="${y}"/>`});
  }
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
    <linearGradient id="land" x2="1" y2="1"><stop stop-color="#b2c68d"/><stop offset=".5" stop-color="#b9c99a"/><stop offset="1" stop-color="#a9bb88"/></linearGradient>
    <radialGradient id="leaf"><stop stop-color="#a6b86b"/><stop offset=".65" stop-color="#79974f"/><stop offset="1" stop-color="#4c7349"/></radialGradient>
    <radialGradient id="autumn"><stop stop-color="#d8bc62"/><stop offset="1" stop-color="#82934e"/></radialGradient>
    <linearGradient id="water" x2="1" y2="1"><stop stop-color="#87b7b4"/><stop offset=".5" stop-color="#6a9fa5"/><stop offset="1" stop-color="#88baba"/></linearGradient>
    <pattern id="paper" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M3 9l3-1M23 54l2 1M48 20l4-1M73 67l3 1" stroke="#455a38" stroke-width="1.5" opacity=".13"/><circle cx="37" cy="36" r="1" fill="#f9f0cf" opacity=".55"/></pattern>
    <pattern id="crops" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><rect width="22" height="22" fill="#cbbb7a"/><path d="M0 0V22" stroke="#e0ce8b" stroke-width="12"/><path d="M16 0V22" stroke="#9eaa67" stroke-width="2"/></pattern>
    <pattern id="stone" width="30" height="20" patternUnits="userSpaceOnUse"><rect width="30" height="20" fill="#b8b29b"/><path d="M0 0H30M0 10H30M15 0V10M0 10V20M30 10V20" stroke="#8c927d" stroke-width="2"/></pattern>
    <g id="oak"><ellipse cx="10" cy="18" rx="35" ry="27" fill="#385638" opacity=".18"/><path d="M-2 12L2 29" stroke="#655b3b" stroke-width="8"/><path d="M-32 1C-45-17-27-27-22-28C-27-48-1-52 8-40C31-47 39-26 32-17C47-6 34 17 18 14C5 30-18 23-22 14C-32 17-42 10-32 1" fill="url(#leaf)" stroke="#5e7c48" stroke-width="2"/><path d="M-22-22Q-13-38 4-30M6-13Q19-23 27-12M-17 1Q-2 7 4-4" fill="none" stroke="#c0c885" stroke-width="5" opacity=".45" stroke-linecap="round"/></g>
    <g id="fir"><ellipse cx="9" cy="21" rx="29" ry="21" fill="#324f3d" opacity=".2"/><path d="M0 0V31" stroke="#6e6548" stroke-width="8"/><path d="M0-61L21-24L11-27L29 1L16-3L35 22Q0 37-33 22L-17-3L-29 2L-11-27L-21-24Z" fill="#496b50" stroke="#3b6048" stroke-width="2"/><path d="M0-52L-14-24L-4-27L-21 2L-6-3L-23 22L0 18Z" fill="#809664"/><path d="M1-39L1 19" stroke="#a7b77c" stroke-width="2" opacity=".35"/></g>
    <g id="fruit"><use href="#oak" transform="scale(.7)"/><g fill="#b46641"><circle cx="-12" cy="-13" r="3"/><circle cx="10" cy="-19" r="3"/><circle cx="5" cy="6" r="3"/></g></g>
    <g id="farm"><path d="M-52 12H58V58H-52Z" fill="#667659" opacity=".22" transform="translate(12 5)"/><path d="M-55-13H55V43H-55Z" fill="#e8ddba" stroke="#a1997d" stroke-width="3"/><path d="M-67-13L-43-50H45L69-13Z" fill="#7a8177" stroke="#53645c" stroke-width="3"/><path d="M-60-15H62M-50-29H53M-43-41H47" stroke="#aab0a0" stroke-width="3"/><rect x="-16" y="12" width="23" height="31" fill="#6a6d54"/><g fill="#61817b" stroke="#f8edca" stroke-width="4"><rect x="-43" y="1" width="17" height="19"/><rect x="24" y="1" width="17" height="19"/></g><path d="M27-43V-64H39V-34" fill="#ac9478"/></g>
    <g id="barn"><rect x="-38" y="-4" width="76" height="43" fill="#c2ae82"/><path d="M-49-4L-31-35H31L49-4Z" fill="#a16b4f" stroke="#80573e" stroke-width="3"/><rect x="-18" y="9" width="36" height="30" fill="#777454"/><path d="M-15 12L15 35M15 12L-15 35" stroke="#bba880" stroke-width="3"/></g>
  </defs>
  <g class="landscape" aria-hidden="true">
  <rect x="-500" y="-500" width="5800" height="3600" fill="url(#land)"/>
  <g fill="#9fb67d" opacity=".58"><path d="M-100 500Q300 100 1000 270T1700 160L1800-200H-100Z"/><path d="M-200 2050Q350 1630 900 1850T1700 2150L1400 2800H-200Z"/><path d="M2900-100Q3400 480 3240 1100T3600 2200L3950 2750H3000Q2780 1700 2900 1100T2600-100Z"/></g>
  <g fill="none" stroke="#dbe1ae" stroke-width="3" opacity=".35"><path d="M-70 400Q540 100 1000 230T1650 50M-70 435Q540 135 1000 265T1650 85M-70 470Q540 170 1000 300T1650 120"/><path d="M3830 1590Q4110 1450 4440 1800T4900 2200M3820 1640Q4110 1500 4430 1850T4900 2250M3810 1690Q4110 1550 4420 1900T4900 2300"/></g>
  <g stroke="#9da873" stroke-width="9"><path d="M80 60L520 90L610 410L170 550L20 310Z" fill="url(#crops)"/><path d="M780 60L1040 100L920 450L750 400Z" fill="#d1c789"/><path d="M350 1690L600 1670L665 1880L300 1920Z" fill="url(#crops)"/><path d="M780 2150L1250 2000L1390 2380L1020 2520L740 2430Z" fill="url(#crops)"/><path d="M2740 170L3100 100L3230 570L2790 450Z" fill="url(#crops)"/><path d="M3990 2150L4210 2100L4360 2440L3980 2510Z" fill="#cfbc79"/></g>
  <g fill="#a6ad84" stroke="#889a77" stroke-width="4"><path d="M4050 110L4380 70L4630 280L4560 425L4290 280Z"/><path d="M4055 122L4270 300L4350 330L4380 460L4530 467L4560 425L4290 280Z" fill="#84967e"/><path d="M3850 1500L4070 1580L4230 1840L4130 1970L3930 1760Z"/><path d="M3850 1500L3855 1630L3910 1840L4100 2080L4130 1970L3930 1760Z" fill="#81927a"/></g>
  <path d="${river.path}" stroke="#8fa685" stroke-width="143" fill="none"/><path d="${river.path}" stroke="#c8c89f" stroke-width="123" fill="none"/><path d="${river.path}" stroke="url(#water)" stroke-width="99" fill="none"/>
  <path d="${river.path}" stroke="#cae0d2" stroke-width="2" stroke-dasharray="35 46 13 98" fill="none" opacity=".7"/>
  <g class="map-details">${decorations.sort((a,b)=>a.y-b.y).map(d=>d.html).join('')}</g>
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
