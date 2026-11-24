import type { Chess, Move } from 'chess.js';
import { evaluate } from './evaluation.ts';
import { MAX_Q_PLY, reconstruct, result, validRequest, moveInput, uci, type Request, type Response, type Score } from './protocol.ts';

export const MATE=100000;
const MATE_THRESHOLD=MATE-32;
type Line={value:number;pv:string[]};
type StopReason='deadline'|'node-limit'|'frontier-limit';
class Stop extends Error{readonly reason:StopReason;constructor(reason:StopReason){super(reason);this.reason=reason;}}
type Context={nodes:number;peakPly:number;seed:number;check:()=>void;visit:(ply:number)=>void};
function context(req:Request,clock:()=>number,start:number):Context{
  const ctx:Context={nodes:0,peakPly:0,seed:req.seed,
    check(){if(clock()-start>=req.limits.timeMs)throw new Stop('deadline');},
    visit(ply){ctx.check();if(ctx.nodes>=req.limits.maxNodes)throw new Stop('node-limit');ctx.nodes++;ctx.peakPly=Math.max(ctx.peakPly,ply);}
  };
  return ctx;
}
function hash(s:string,seed:number):number{
  let h=(2166136261^seed)>>>0;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;return h;
}
function ordered(moves:Move[],seed:number):Move[]{
  return moves.sort((a,b)=>hash(uci(a),seed)-hash(uci(b),seed)||(uci(a)<uci(b)?-1:uci(a)>uci(b)?1:0));
}
// Checkmate outranks draw claims, matching the canonical casual match policy.
function terminal(game:Chess,moves:Move[],ply:number):number|null{
  if(moves.length===0)return game.isCheck()?-MATE+ply:0;
  if(game.isDrawByFiftyMoves()||game.isThreefoldRepetition()||game.isInsufficientMaterial())return 0;
  return null;
}
function child(game:Chess,move:Move,search:()=>Line):Line{
  game.move(moveInput(uci(move)));
  try{const line=search();return {value:-line.value,pv:[uci(move),...line.pv]};}
  finally{game.undo();}
}
/** Capture/promotion frontier; checked nodes cannot stand pat. At an unresolved checked cap,
 * abort the iteration rather than pretend the checked position has a reliable static score. */
function quiet(game:Chess,alpha:number,beta:number,ply:number,q:number,ctx:Context):Line{
  ctx.visit(ply);
  const moves=game.moves({verbose:true}),end=terminal(game,moves,ply);
  if(end!==null)return {value:end,pv:[]};
  const checked=game.isCheck();
  let best:Line={value:-Infinity,pv:[]};
  if(!checked){
    best={value:evaluate(game,game.turn()).total,pv:[]};
    if(best.value>=beta||q===MAX_Q_PLY)return best;
    alpha=Math.max(alpha,best.value);
  }else if(q===MAX_Q_PLY)throw new Stop('frontier-limit');
  const frontier=checked?moves:moves.filter(m=>m.captured||m.promotion);
  for(const move of ordered(frontier,ctx.seed)){
    ctx.check();
    const line=child(game,move,()=>quiet(game,-beta,-alpha,ply+1,q+1,ctx));
    if(line.value>best.value)best=line;
    alpha=Math.max(alpha,line.value);
    if(alpha>=beta)break;
  }
  return best;
}
function negamax(game:Chess,depth:number,alpha:number,beta:number,ply:number,ctx:Context):Line{
  if(depth===0)return quiet(game,alpha,beta,ply,0,ctx);
  ctx.visit(ply);
  const moves=game.moves({verbose:true}),end=terminal(game,moves,ply);
  if(end!==null)return {value:end,pv:[]};
  let best:Line={value:-Infinity,pv:[]};
  for(const move of ordered(moves,ctx.seed)){
    ctx.check();
    const line=child(game,move,()=>negamax(game,depth-1,-beta,-alpha,ply+1,ctx));
    if(line.value>best.value)best=line;
    alpha=Math.max(alpha,line.value);
    if(alpha>=beta)break;
  }
  return best;
}
function score(value:number,root:'w'|'b'):Score{
  return Math.abs(value)>=MATE_THRESHOLD?{kind:'mate',winner:value>0?root:root==='w'?'b':'w',plies:MATE-Math.abs(value),perspective:root}
    :{kind:'cp',value:value===0?0:value,perspective:root};
}
/** Test/diagnostic entry for exact-depth parity. No transposition cache or P04 heuristics. */
export function fixedSearch(game:Chess,req:Request,depth:number,clock:()=>number=()=>performance.now()){
  if(!Number.isInteger(depth)||depth<0||depth>req.limits.maxDepth)throw new RangeError('Invalid depth');
  const ctx=context(req,clock,clock());
  const line=negamax(game,depth,-Infinity,Infinity,0,ctx);
  return {...line,nodes:ctx.nodes,peakPly:ctx.peakPly};
}
export function runAdvanced(req:Request,clock:()=>number=()=>performance.now()):Response{
  const start=clock(),elapsed=()=>Math.max(0,clock()-start),ctx=context(req,clock,start);
  if(!validRequest(req)||req.strategy!=='advanced')return result(req);
  let game:Chess|undefined,stable:Line|undefined,completedDepth=0,fallback:string|null=null;
  try{
    ctx.check();game=reconstruct(req,ctx.check);
    const moves=game.moves({verbose:true}),end=terminal(game,moves,0);
    if(end!==null)return result(req,{status:'terminal',reason:'terminal',score:score(end,game.turn()),nodes:0,elapsedMs:elapsed()});
    fallback=uci(ordered(moves,req.seed)[0]);ctx.check();
    for(let depth=1;depth<=req.limits.maxDepth;depth++){
      const line=negamax(game,depth,-Infinity,Infinity,0,ctx);
      ctx.check(); // only publish fully completed iterations within budget
      stable=line;completedDepth=depth;
      if(line.value===MATE-1)break; // proven fastest possible mate
    }
    const pv=stable?.pv??[];
    return result(req,{status:'complete',reason:'none',move:pv[0]??fallback,pv,score:stable?score(stable.value,game.turn()):null,completedDepth,nodes:ctx.nodes,elapsedMs:elapsed()});
  }catch(error){
    if(error instanceof Stop){
      const pv=stable?.pv??(fallback?[fallback]:[]);
      return result(req,{status:'timeout',reason:error.reason,move:pv[0]??null,pv,score:stable&&game?score(stable.value,game.turn()):null,completedDepth,nodes:ctx.nodes,elapsedMs:elapsed()});
    }
    return result(req,{reason:game?'worker-error':'invalid-request',nodes:ctx.nodes,elapsedMs:elapsed()});
  }
}
