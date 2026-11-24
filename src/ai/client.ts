import type { Chess, Move } from 'chess.js';
import { HARD_GRACE_MS, MAX_NODES, MAX_ADVANCED_NODES, MAX_TIME_MS, MAX_DEPTH, PROTOCOL, positionOf, result, samePosition, uci, validRequest, validResponse,
  type Identity, type Reason, type Request, type Response, type Strategy } from './protocol.ts';

export type Port={onmessage:((e:MessageEvent<unknown>)=>void)|null;onerror:((e:ErrorEvent)=>void)|null;onmessageerror:((e:MessageEvent)=>void)|null;postMessage:(m:Request)=>void;terminate:()=>void};
export type Job={request:Request;promise:Promise<Response>;cancel:()=>void};
type Factory=()=>Port;
const workerFactory:Factory=()=>new Worker(new URL('./engine.worker.ts',import.meta.url),{type:'module'}) as unknown as Port;
let nextId=0;
export function searchId():string {return 'search-'+(++nextId).toString(36);}
export function configuredStrategy():Strategy{return import.meta.env?.VITE_AI_OPTIMIZED_SEARCH==='true'?'optimized':import.meta.env?.VITE_AI_ADVANCED_SEARCH==='true'?'advanced':import.meta.env?.VITE_AI_WORKER_FOUNDATION==='true'?'foundation':'legacy';}
export function buildRequest(game:Chess,identity:Identity,purpose:Request['purpose'],strategy:Strategy,timeMs=500,maxNodes=(strategy==='advanced'||strategy==='optimized')?MAX_ADVANCED_NODES:MAX_NODES,seed=0,maxDepth=(strategy==='advanced'||strategy==='optimized')?3:1):Request{
  return {...identity,protocol:PROTOCOL,type:'search',purpose,strategy,position:positionOf(game),
    limits:{timeMs:Math.max(1,Math.min(MAX_TIME_MS,Math.floor(timeMs))),maxDepth:Math.min(MAX_DEPTH,maxDepth),maxNodes},seed};
}
/** One bounded job, one worker, one resolution. No expensive synchronous AI fallback. */
export function startJob(req:Request,legal:ReadonlySet<string>,terminal:boolean,factory:Factory=workerFactory):Job{
  let port:Port|undefined,timer:ReturnType<typeof setTimeout>|undefined,settled=false;
  const start=performance.now();
  let resolve!:(r:Response)=>void;
  const promise=new Promise<Response>(r=>{resolve=r;});
  const finish=(response:Response)=>{
    if(settled)return;
    settled=true;
    if(timer!==undefined)clearTimeout(timer);
    if(port){port.onmessage=null;port.onerror=null;port.onmessageerror=null;try{port.terminate();}catch{/* already closed */}}
    resolve(response);
  };
  const fallback=(reason:Reason)=>{
    const move=terminal?null:[...legal].sort()[0]??null;
    // Do not log FEN, PGN, identifiers, or user data. Diagnostics live in response only.
    finish(result(req,{status:'fallback',reason,move,pv:move?[move]:[],elapsedMs:performance.now()-start}));
  };
  if(!validRequest(req)){fallback('invalid-request');return {request:req,promise,cancel:()=>{}};}
  try{
    port=factory();
    port.onmessage=e=>{
      if(!validResponse(e.data,req,legal,terminal)){fallback('invalid-response');return;}
      if(e.data.status==='error'||(e.data.status==='timeout'&&!e.data.move)){fallback(e.data.reason);return;}
      finish(e.data);
    };
    port.onerror=e=>{e.preventDefault?.();fallback('worker-error');};
    port.onmessageerror=()=>fallback('invalid-response');
    timer=setTimeout(()=>fallback('deadline'),req.limits.timeMs+HARD_GRACE_MS);
    port.postMessage(req);
  }catch{fallback('unavailable');}
  return {request:req,promise,cancel:()=>finish(result(req,{status:'cancelled',reason:'cancelled',elapsedMs:performance.now()-start}))};
}
export function startAdvisory(game:Chess,identity:Identity,purpose:Request['purpose'],strategy:Strategy=configuredStrategy(),timeMs=500,factory?:Factory):Job{
  const req=buildRequest(game,identity,purpose,strategy,timeMs);
  const terminal=game.isGameOver();
  const legal=new Set(terminal?[]:game.moves({verbose:true}).map(uci));
  return startJob(req,legal,terminal,factory);
}
/** Revalidate against live canonical state; response never writes to the game. */
export function liveCandidate(game:Chess,req:Request,res:Response,current:Identity):Move|undefined{
  if(res.status==='cancelled'||!res.move||res.searchId!==current.searchId||res.gameId!==current.gameId||
     res.revision!==current.revision||req.searchId!==current.searchId||req.gameId!==current.gameId||req.revision!==current.revision||
     !samePosition(game,req.position)||game.isGameOver())return undefined;
  return game.moves({verbose:true}).find(m=>uci(m)===res.move);
}
