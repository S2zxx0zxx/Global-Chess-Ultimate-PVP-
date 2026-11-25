import {MAX_PV} from './protocol.ts';
import {seededRank} from './ordering.ts';
export const CACHE_CAPACITY=1024;
export const MAX_KEY_LENGTH=16000;
const MATE_THRESHOLD=99968;
export type Bound='exact'|'lower'|'upper';
export type Entry={key:string;depth:number;bound:Bound;value:number;pv:string[]};
export function normalizeMate(value:number,ply:number){return value>=MATE_THRESHOLD?value+ply:value<=-MATE_THRESHOLD?value-ply:value;}
export function restoreMate(value:number,ply:number){return value>=MATE_THRESHOLD?value-ply:value<=-MATE_THRESHOLD?value+ply:value;}
export function boundFor(value:number,alpha:number,beta:number):Bound{return value<=alpha?'upper':value>=beta?'lower':'exact';}
/** Direct mapped, fixed slots; full identity checked on every probe, no hash-only reuse. */
export class TranspositionCache{
  private readonly slots:(Entry|undefined)[];
  readonly capacity:number;readonly seed:number;
  private readonly hash:(key:string,seed:number)=>number;
  size=0;hits=0;collisions=0;evictions=0;writes=0;cutoffs=0;
  constructor(capacity=CACHE_CAPACITY,seed=0,hash=seededRank){
    if(!Number.isInteger(capacity)||capacity<1||capacity>CACHE_CAPACITY)throw new RangeError('Cache capacity');
    this.capacity=capacity;this.seed=seed;this.hash=hash;this.slots=new Array(capacity);
  }
  private slot(key:string){return (this.hash(key,this.seed)>>>0)%this.capacity;}
  probe(key:string|null):Entry|undefined{
    if(key===null||key.length>MAX_KEY_LENGTH)return;
    const e=this.slots[this.slot(key)];if(!e)return;
    if(e.key!==key){this.collisions++;return;}
    this.hits++;return e;
  }
  store(key:string|null,depth:number,value:number,bound:Bound,pv:readonly string[],ply:number){
    if(key===null||key.length>MAX_KEY_LENGTH||pv.length>MAX_PV||!Number.isFinite(value))return;
    const i=this.slot(key),old=this.slots[i];
    // Preserve deeper same-position entries; prefer exact at equal depth.
    if(old?.key===key&&(old.depth>depth||(old.depth===depth&&old.bound==='exact'&&bound!=='exact')))return;
    if(!old)this.size++;else if(old.key!==key)this.evictions++;
    this.slots[i]={key,depth,bound,value:normalizeMate(value,ply),pv:[...pv]};this.writes++;
  }
  usable(e:Entry|undefined,depth:number,alpha:number,beta:number,ply:number):number|undefined{
    if(!e||e.depth!==depth)return;
    const v=restoreMate(e.value,ply);
    if(e.bound==='exact'||(e.bound==='lower'&&v>=beta)||(e.bound==='upper'&&v<=alpha)){this.cutoffs++;return v;}
  }
}
