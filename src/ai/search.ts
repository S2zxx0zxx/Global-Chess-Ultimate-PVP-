import { runAdvanced } from './advanced.ts';
import { chooseComputerMove } from '../game.ts';
import { evaluate } from './evaluation.ts';
import { reconstruct, result, uci, validRequest, moveInput, type Request, type Response, type Score } from './protocol.ts';
import type { Chess } from 'chess.js';

const now=()=>performance.now();
export function seededOrder(s:string,seed:number):number {
  let h=(2166136261^seed)>>>0;
  for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
  return h;
}
const opposite=(side:'w'|'b')=>side==='w'?'b':'w';
function terminalScore(game:Chess, root:'w'|'b',plies:0|1):Score {
  return game.isCheckmate()?{kind:'mate',winner:opposite(game.turn()),plies,perspective:root}:{kind:'cp',value:0,perspective:root};
}
function rank(score:Score):number {
  return score.kind==='cp'?score.value:score.winner===score.perspective?100000-score.plies:-100000+score.plies;
}
// P02 is only a one-ply evaluator. P03 will supply recursive search.
export function runSearch(req:Request, clock:()=>number=now):Response {
  if(req.strategy==='advanced'||req.strategy==='optimized')return runAdvanced(req,clock);
  const start=clock(),elapsed=()=>Math.max(0,clock()-start);
  if(!validRequest(req))return result(req);
  let game:Chess;
  try{game=reconstruct(req);}catch{return result(req,{elapsedMs:elapsed()});}
  const root=game.turn();
  if(game.isGameOver())return result(req,{status:'terminal',reason:'terminal',score:terminalScore(game,root,0),nodes:0,elapsedMs:elapsed()});
  const legal=game.moves({verbose:true}).map(uci).sort((a,b)=>seededOrder(a,req.seed)-seededOrder(b,req.seed)||(a<b?-1:a>b?1:0));
  let best=legal[0]??null,bestScore:Score|null=null,nodes=0;
  const timeout=(reason:'deadline'|'node-limit')=>result(req,{status:'timeout',reason,move:best,pv:best?[best]:[],nodes,elapsedMs:elapsed()});
  if(elapsed()>=req.limits.timeMs)return timeout('deadline');
  if(req.strategy==='legacy'){
    // Existing heuristic kept inside a worker; its internal comparison count is not instrumented.
    try{
      const m=chooseComputerMove(game),move=m?uci(m):null;
      if(elapsed()>=req.limits.timeMs)return timeout('deadline');
      if(!move||!legal.includes(move))throw Error('No legal result');
      return result(req,{status:'complete',reason:'none',move,pv:[move],elapsedMs:elapsed()});
    }catch{return result(req,{reason:'worker-error',elapsedMs:elapsed()});}
  }
  try{
    for(const move of legal){
      if(elapsed()>=req.limits.timeMs)return timeout('deadline');
      if(nodes>=req.limits.maxNodes)return timeout('node-limit');
      game.move(moveInput(move));
      let score:Score;
      try{score=game.isGameOver()?terminalScore(game,root,1):{kind:'cp',value:evaluate(game,root).total,perspective:root};}
      finally{game.undo();}
      nodes++;
      if(!bestScore||rank(score)>rank(bestScore)){best=move;bestScore=score;}
      if(elapsed()>=req.limits.timeMs)return timeout('deadline');
    }
    return result(req,{status:'complete',reason:'none',move:best,pv:best?[best]:[],score:bestScore,nodes,completedDepth:1,elapsedMs:elapsed()});
  }catch{
    // Do not claim a depth/score from a failed iteration. Legacy recovery stays off the UI thread.
    if(elapsed()<req.limits.timeMs){
      try{const old=chooseComputerMove(game),m=old?uci(old):null;
        if(m&&legal.includes(m)&&elapsed()<req.limits.timeMs)return result(req,{status:'complete',reason:'legacy-recovery',move:m,pv:[m],elapsedMs:elapsed()});
      }catch{/* hard deadline remains enforced by client */}
    }
    return result(req,{reason:'worker-error',elapsedMs:elapsed()});
  }
}
