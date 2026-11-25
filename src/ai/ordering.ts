import type {Move,Chess} from 'chess.js';
import {MAX_PV,uci} from './protocol.ts';
const VALUES={p:100,n:320,b:330,r:500,q:900,k:20000} as const;
export const HISTORY_CAP=16384;
export const KILLER_SLOTS=MAX_PV+1;
export function seededRank(s:string,seed:number):number{
  let n=(2166136261^seed)>>>0;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619)>>>0;return n;
}
export const isQuiet=(m:Move)=>!m.captured&&!m.promotion;
export function captureRank(m:Move):number{
  return (m.captured?16*VALUES[m.captured]-VALUES[m.piece]:0)+(m.promotion?16*(VALUES[m.promotion]-VALUES.p):0);
}
function index(m:Move):number{
  const sq=(s:string)=>(s.charCodeAt(0)-97)*8+Number(s[1])-1;
  return (m.color==='w'?0:4096)+sq(m.from)*64+sq(m.to);
}
/** Per-job only. Two quiet killers per ply and saturating side/from/to history. */
export class Ordering {
  readonly killers:(string|null)[][]=Array.from({length:KILLER_SLOTS},()=>[null,null]);
  readonly history=new Int16Array(8192);
  readonly seed:number;
  constructor(seed:number){this.seed=seed;}
  reward(move:Move,ply:number,depth:number){
    if(!isQuiet(move)||ply<0||ply>=KILLER_SLOTS)return;
    const u=uci(move),k=this.killers[ply];
    if(k[0]!==u){k[1]=k[0];k[0]=u;}
    const i=index(move),bonus=Math.min(1024,depth*depth*32);
    this.history[i]=Math.min(HISTORY_CAP,this.history[i]+bonus);
  }
  decay(){for(let i=0;i<this.history.length;i++)this.history[i]=Math.trunc(this.history[i]/2);}
  order(moves:Move[],ply:number,hint?:string|null):Move[]{
    const k=this.killers[ply]??[];
    // Only rank moves from chess.js legal list; no hint is inserted into that list.
    const ranked=moves.map(m=>{const u=uci(m);return {m,u,seed:seededRank(u,this.seed),
      rank:u===hint?1000000:!isQuiet(m)?100000+captureRank(m):u===k[0]?50000:u===k[1]?49000:this.history[index(m)]};});
    ranked.sort((a,b)=>b.rank-a.rank||a.seed-b.seed||(a.u<b.u?-1:a.u>b.u?1:0));
    return ranked.map(x=>x.m);
  }
}
export function repetitionKey(fen:string):string{return fen.split(' ').slice(0,4).join(' ');}
const half=(fen:string)=>Number(fen.split(' ')[4]);
/** chess.js.fen() canonicalizes legally relevant EP; include exact reversible history
 * counts rather than relying on a board hash to encode draw rights. */
export class PositionContext{
  private counts=new Map<string,number>();
  constructor(game:Chess){
    const history=game.history({verbose:true});
    this.add(repetitionKey(history[0]?.before??game.fen()));
    for(const m of history)this.push(m);
  }
  private add(k:string){this.counts.set(k,(this.counts.get(k)??0)+1);}
  push(m:Move):()=>void{
    const k=repetitionKey(m.after);
    const irreversible=m.piece==='p'||Boolean(m.captured)||m.before.split(' ')[2]!==m.after.split(' ')[2];
    if(irreversible){const prior=this.counts;this.counts=new Map();this.add(k);return()=>{this.counts=prior;};}
    this.add(k);
    return()=>{const n=this.counts.get(k)??0;if(n<=1)this.counts.delete(k);else this.counts.set(k,n-1);};
  }
  identity(game:Chess):string|null{
    // Skip suspicious/oversized history, not just known threefold positions.
    if(this.counts.size>101||half(game.fen())>=100)return null;
    const entries=[...this.counts].sort(([a],[b])=>a<b?-1:a>b?1:0);
    if(entries.some(([,n])=>n>2))return null;
    return JSON.stringify([repetitionKey(game.fen()),half(game.fen()),entries]);
  }
}
