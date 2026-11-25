import {useEffect,useRef,useState,type PointerEvent,type MouseEvent,type KeyboardEvent} from 'react';
import type {Square} from 'chess.js';
import {squareAt,squareCenter,sameRect,type Rect} from './gameplay-events';
type Config={token:string;flipped:boolean;enabled:boolean;reducedMotion:boolean;piece:(s:Square)=>string|null;tap:(s:Square)=>void;onPick?:()=>void;onInvalid?:()=>void;drop:(from:Square,to:Square|null)=>boolean};
type Drag={pointer:number;source:Square;piece:string;token:string;rect:Rect;flipped:boolean;startX:number;startY:number;dragging:boolean;target:HTMLElement};
type Ghost={source:Square;piece:string;x:number;y:number;size:number;returning:boolean};
export function useBoardDrag(config:Config){
 const ref=useRef<HTMLDivElement>(null),current=useRef(config),held=useRef<Drag|null>(null),suppress=useRef(false),timer=useRef<number|undefined>(undefined);
 const [ghost,setGhost]=useState<Ghost|null>(null);current.current=config;
 const clearGhost=()=>{window.clearTimeout(timer.current);setGhost(null);};
 const cancel=(snap=false)=>{
  const d=held.current;held.current=null;
  if(!d){clearGhost();return;}
  if(d.dragging)suppress.current=true;
  try{if(d.target.hasPointerCapture(d.pointer))d.target.releasePointerCapture(d.pointer);}catch{}
  if(snap&&d.dragging&&!current.current.reducedMotion&&sameRect(d.rect,ref.current?.getBoundingClientRect()??d.rect)){
   const c=squareCenter(d.rect,d.source,d.flipped);
   setGhost({source:d.source,piece:d.piece,x:c.x-d.rect.left,y:c.y-d.rect.top,size:d.rect.width/8,returning:true});
   timer.current=window.setTimeout(()=>setGhost(null),150);
  }else clearGhost();
 };
 useEffect(()=>{cancel();},[config.token,config.flipped,config.enabled]);
 useEffect(()=>{
  const stop=()=>cancel();const onScroll=()=>{const d=held.current;if(d&&ref.current&&!sameRect(d.rect,ref.current.getBoundingClientRect()))cancel();};window.addEventListener('resize',stop);window.addEventListener('scroll',onScroll,true);window.addEventListener('blur',stop);
  document.addEventListener('visibilitychange',stop);
  const observer=new ResizeObserver(()=>{const d=held.current;if(d&&ref.current&&!sameRect(d.rect,ref.current.getBoundingClientRect()))cancel();});
  if(ref.current)observer.observe(ref.current);
  return()=>{window.removeEventListener('resize',stop);window.removeEventListener('scroll',onScroll,true);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',stop);observer.disconnect();const d=held.current;held.current=null;if(d)try{d.target.releasePointerCapture(d.pointer);}catch{}window.clearTimeout(timer.current);};
 },[config.enabled]);
 const pointerDown=(e:PointerEvent<HTMLDivElement>)=>{
  if(!e.isPrimary||e.button!==0||held.current||!ref.current)return;
  suppress.current=false;clearGhost();
  const c=current.current,rect=ref.current.getBoundingClientRect(),target=(e.target as HTMLElement).closest<HTMLElement>('[data-square]');
  const source=target?.dataset.square as Square|undefined;
  if(!c.enabled||!source||!target||!ref.current.contains(target)||squareAt(rect,e.clientX,e.clientY,c.flipped)!==source)return;
  const piece=c.piece(source);if(!piece)return;
  // Prevent pointer focus from auto-scrolling the board mid-gesture. Tap is handled on release; keyboard clicks remain native.
  e.preventDefault();
  held.current={pointer:e.pointerId,source,piece,token:c.token,rect,flipped:c.flipped,startX:e.clientX,startY:e.clientY,dragging:false,target};
  try{target.setPointerCapture(e.pointerId);}catch{held.current=null;}
 };
 const pointerMove=(e:PointerEvent<HTMLDivElement>)=>{
  const d=held.current,c=current.current;if(!d||d.pointer!==e.pointerId)return;
  if(!c.enabled||c.token!==d.token||c.flipped!==d.flipped||!ref.current||!sameRect(d.rect,ref.current.getBoundingClientRect())){cancel();return;}
  if(!d.dragging&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<6)return;
  if(!d.dragging)c.onPick?.();d.dragging=true;suppress.current=true;e.preventDefault();
  setGhost({source:d.source,piece:d.piece,x:e.clientX-d.rect.left,y:e.clientY-d.rect.top,size:d.rect.width/8,returning:false});
 };
 const pointerUp=(e:PointerEvent<HTMLDivElement>)=>{
  const d=held.current,c=current.current;if(!d||d.pointer!==e.pointerId)return;
  e.preventDefault();suppress.current=true;
  const valid=c.enabled&&c.token===d.token&&c.flipped===d.flipped&&ref.current&&sameRect(d.rect,ref.current.getBoundingClientRect());
  const to=valid?squareAt(d.rect,e.clientX,e.clientY,d.flipped):null;
  const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-square]');
  const actual=hit&&ref.current?.contains(hit)&&hit.dataset.square===to?to:null;
  if(!d.dragging){if(valid&&actual===d.source)c.tap(d.source);cancel();return;}
  const accepted=Boolean(valid&&actual&&c.drop(d.source,actual));if(valid&&!accepted)c.onInvalid?.();cancel(!accepted);
 };
 const clickCapture=(e:MouseEvent<HTMLDivElement>)=>{if(suppress.current&&e.detail!==0){e.preventDefault();e.stopPropagation();suppress.current=false;}};
 const keyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  const cell=(e.target as HTMLElement).closest<HTMLElement>('[data-square]');if(!cell||!ref.current)return;
  const cells=[...ref.current.querySelectorAll<HTMLButtonElement>('[data-square]')],i=cells.indexOf(cell as HTMLButtonElement);
  const delta:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8};
  if(e.key==='Escape'){cancel();return;}if(!(e.key in delta))return;
  e.preventDefault();const n=i+delta[e.key];if(n>=0&&n<64&&(Math.abs(delta[e.key])===8||Math.floor(i/8)===Math.floor(n/8)))cells[n]?.focus();
 };
 return {ref,ghost,handlers:{onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:pointerUp,onPointerCancel:()=>cancel(),onLostPointerCapture:()=>{if(held.current)cancel();},onClickCapture:clickCapture,onKeyDown:keyDown}};
}
