import { clamp } from '../map/geometry.ts';
import type { Point } from '../map/geometry.ts';
export type CameraState = { x:number; y:number; zoom:number };
export function zoomAt(state:CameraState, factor:number, anchor:Point, size:Point):CameraState {
  const zoom=clamp(state.zoom*factor,.45,1.8);
  return { zoom, x:state.x+(anchor.x-size.x/2)*(1/state.zoom-1/zoom), y:state.y+(anchor.y-size.y/2)*(1/state.zoom-1/zoom) };
}
export class MapCamera {
  state:CameraState;
  private points = new Map<number,Point>();
  private observer:ResizeObserver;
  private manual:()=>void;
  private viewport:HTMLElement;
  private world:SVGGElement;
  private width:number;
  private height:number;
  constructor(viewport:HTMLElement, world:SVGGElement, width:number, height:number, initial:CameraState, onManual:()=>void) {
    this.viewport=viewport;this.world=world;this.width=width;this.height=height;
    this.state=initial;this.manual=onManual;
    this.observer=new ResizeObserver(()=>this.render());this.observer.observe(viewport);
    viewport.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      viewport.setPointerCapture(e.pointerId);this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      this.manual(); viewport.classList.add('is-dragging');
    });
    viewport.addEventListener('pointermove',e=>{
      const old=this.points.get(e.pointerId);if(!old)return;
      const before=[...this.points.values()];this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const after=[...this.points.values()];
      if(before.length===1){this.pan(e.clientX-old.x,e.clientY-old.y);return;}
      if(before.length===2){
        const center=(p:Point[])=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
        const a=center(before),b=center(after),box=viewport.getBoundingClientRect();
        this.pan(b.x-a.x,b.y-a.y);
        const d=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y);
        if(d>5)this.zoom(Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y)/d,{x:b.x-box.left,y:b.y-box.top});
      }
    });
    const end=(e:PointerEvent)=>{this.points.delete(e.pointerId);if(!this.points.size)viewport.classList.remove('is-dragging');};
    viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('lostpointercapture',end);
    viewport.addEventListener('wheel',e=>{e.preventDefault();this.manual();const box=viewport.getBoundingClientRect();this.zoom(Math.exp(-e.deltaY*.0015),{x:e.clientX-box.left,y:e.clientY-box.top});},{passive:false});
    viewport.addEventListener('keydown',e=>{
      const moves:Record<string,Point>={ArrowLeft:{x:90,y:0},ArrowRight:{x:-90,y:0},ArrowUp:{x:0,y:90},ArrowDown:{x:0,y:-90}};
      if(moves[e.key]){e.preventDefault();this.manual();this.pan(moves[e.key].x,moves[e.key].y);}
      if(['+','=','-'].includes(e.key)){e.preventDefault();this.manual();this.zoom(e.key==='-'?1/1.2:1.2);}
    });
  }
  private size(){return {x:this.viewport.clientWidth,y:this.viewport.clientHeight};}
  render(){
    const size=this.size(),halfX=size.x/(2*this.state.zoom),halfY=size.y/(2*this.state.zoom);
    this.state.x=clamp(this.state.x,Math.min(this.width/2,halfX-130),Math.max(this.width/2,this.width-halfX+130));
    this.state.y=clamp(this.state.y,Math.min(this.height/2,halfY-130),Math.max(this.height/2,this.height-halfY+130));
    this.world.setAttribute('transform',`translate(${size.x/2-this.state.x*this.state.zoom} ${size.y/2-this.state.y*this.state.zoom}) scale(${this.state.zoom})`);
    this.viewport.dataset.zoom=this.state.zoom.toFixed(3);
    this.viewport.dispatchEvent(new CustomEvent('camera-change'));
  }
  pan(x:number,y:number){this.state.x-=x/this.state.zoom;this.state.y-=y/this.state.zoom;this.render();}
  zoom(factor:number,anchor:Point={x:this.size().x/2,y:this.size().y/2}){this.state=zoomAt(this.state,factor,anchor,this.size());this.render();}
  center(point:Point){
    // Keep the vehicle clear of the desktop panel and leave space ahead on mobile.
    this.state.x=point.x-(this.viewport.clientWidth>720?100:0)/this.state.zoom;
    this.state.y=point.y+(this.viewport.clientWidth<=720?105:40)/this.state.zoom;this.render();
  }
  destroy(){this.observer.disconnect();}
}
