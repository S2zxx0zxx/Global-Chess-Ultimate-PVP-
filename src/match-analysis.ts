import {Chess,type Move} from 'chess.js';
import {buildRequest,startJob,searchId,type Job,type Port} from './ai/client.ts';
import {positionOf,validResponse,legalPV,moveInput,uci,type Position,type Request,type Response,type Score} from './ai/protocol.ts';
import {replayPosition,type ReplayTimeline} from './chess-state.ts';
export const VERSION='p06-advanced-v1',CACHE_KEY='gcu.analysis-cache.v1',PRACTICE_KEY='gcu.review-practice.v1';
export const CACHE_CAP=48,CACHE_CHARS=256000,PRACTICE_CAP=24,PRACTICE_CHARS=96000,BATCH=12,ALTERNATIVES=4;
type Side='w'|'b';
export type WhiteScore={kind:'cp';value:number}|{kind:'mate';winner:Side;plies:number};
export type Label='best'|'good'|'inaccuracy'|'mistake'|'blunder'|'uncertain';
export type Line={move:string;san:string;pv:string[];sanPV:string[];score:WhiteScore;depth:number;complete:boolean};
export type Report={position:Position;best:Line|null;score:WhiteScore|null;depth:number;status:Response['status'];alternatives:Line[];examined:number;legalCount:number;played:string|null;classification:Label;lossCp:number|null;comparable:boolean};
type Store=Pick<Storage,'getItem'|'setItem'>;
const storage=():Store|undefined=>{try{return globalThis.localStorage;}catch{return undefined;}};
export function copyPosition(p:Position){if(!Array.isArray(p.moves)||p.moves.length>1024)throw Error('Invalid history');const g=new Chess(p.initialFen);for(const u of p.moves){if(g.isGameOver()||uci(g.move(moveInput(u)))!==u)throw Error('Invalid prefix');}if(g.fen()!==p.fen)throw Error('Position mismatch');return g;}
export const whiteScore=(s:Score,offset=0):WhiteScore=>s.kind==='cp'?{kind:'cp',value:s.value===0?0:s.value*(s.perspective==='w'?1:-1)}:{kind:'mate',winner:s.winner,plies:s.plies+offset};
export const scoreLabel=(s:WhiteScore|null)=>!s?'Unavailable':s.kind==='mate'?(s.winner==='w'?'White':'Black')+' mate in '+s.plies+' plies':(s.value>0?'+':'')+(s.value/100).toFixed(2);
export const whiteShare=(s:WhiteScore|null)=>!s?null:s.kind==='mate'?(s.winner==='w'?100:0):50+48*Math.tanh(s.value/600);
export function sanLine(p:Position,pv:readonly string[]):string[]|null{try{const g=copyPosition(p),out:string[]=[];for(const u of pv){if(g.isGameOver())return null;const m=g.move(moveInput(u));if(uci(m)!==u)return null;out.push(m.san);}return out;}catch{return null;}}
const terminal=(g:Chess):WhiteScore=>g.isCheckmate()?{kind:'mate',winner:g.turn()==='w'?'b':'w',plies:0}:{kind:'cp',value:0};
const utility=(s:WhiteScore,side:Side)=>s.kind==='cp'?s.value*(side==='w'?1:-1):s.winner===side?100000-s.plies:-100000+s.plies;
export const THRESHOLDS={good:30,inaccuracy:80,mistake:180};
export function classify(best:Line|null,played:Line|null,side:Side,t=THRESHOLDS):{label:Label;lossCp:number|null;comparable:boolean}{
 const uncertain={label:'uncertain' as const,lossCp:null,comparable:false};
 if(!best||!played||!best.complete||!played.complete||best.depth!==played.depth)return uncertain;
 if(best.move===played.move)return {label:'best',lossCp:0,comparable:true};
 const a=utility(best.score,side),b=utility(played.score,side);if(b>a)return uncertain;
 if(best.score.kind==='mate'||played.score.kind==='mate')return {label:best.score.kind==='mate'&&played.score.kind==='mate'&&best.score.winner===played.score.winner?'good':'blunder',lossCp:null,comparable:true};
 const loss=a-b;return {label:loss<=t.good?'good':loss<=t.inaccuracy?'inaccuracy':loss<=t.mistake?'mistake':'blunder',lossCp:loss,comparable:true};
}
type Entry={key:string;response:Response};
export class AnalysisCache{
 private entries:Entry[]=[];private store?:Store;
 constructor(store:Store|undefined=storage()){this.store=store;try{const raw=store?.getItem(CACHE_KEY);if(raw&&raw.length<=CACHE_CHARS){const x=JSON.parse(raw);if(Array.isArray(x))this.entries=x.filter(e=>e&&typeof e.key==='string'&&e.response&&typeof e.response==='object').slice(0,CACHE_CAP);}}catch{}}
 private key(record:string,q:Request){return JSON.stringify([VERSION,record,q.position,q.strategy,q.limits,q.seed]);}
 get(record:string,q:Request,g:Chess){const k=this.key(record,q),i=this.entries.findIndex(e=>e.key===k);if(i<0)return;const e=this.entries[i],res={...e.response,searchId:q.searchId,gameId:q.gameId,revision:q.revision};if(res.status!=='complete'||!validResponse(res,q,new Set(g.moves({verbose:true}).map(uci)),false)){this.entries.splice(i,1);return;}this.entries.splice(i,1);this.entries.unshift(e);return res;}
 put(record:string,q:Request,res:Response){if(res.status!=='complete'||!res.score||res.completedDepth===0)return;const key=this.key(record,q);if(key.length>16000)return;this.entries=[{key,response:res},...this.entries.filter(e=>e.key!==key)].slice(0,CACHE_CAP);while(JSON.stringify(this.entries).length>CACHE_CHARS)this.entries.pop();try{this.store?.setItem(CACHE_KEY,JSON.stringify(this.entries));}catch{}}
 size(){return this.entries.length;}
}
export class AnalysisSession{
 private active:Job|null=null;private stopped=false;private record:string;private cache:AnalysisCache;private factory?:()=>Port;
 constructor(record:string,cache=new AnalysisCache(),factory?:()=>Port){this.record=record;this.cache=cache;this.factory=factory;}
 cancel(){this.stopped=true;this.active?.cancel();this.active=null;}
 private check(){if(this.stopped)throw Error('Analysis cancelled');}
 private async search(g:Chess,revision:number,depth:number,budget:number){this.check();const q=buildRequest(g,{searchId:searchId(),gameId:'analysis-'+searchId(),revision},'analysis','advanced',budget,15000,7,depth);const cached=this.cache.get(this.record,q,g);if(cached)return {q,res:cached};const j=startJob(q,new Set(g.moves({verbose:true}).map(uci)),false,this.factory);this.active=j;const res=await j.promise;if(this.active===j)this.active=null;this.check();this.cache.put(this.record,q,res);return {q,res};}
 async inspect(position:Position,revision:number,played:string|null=null,alternatives=false):Promise<Report>{
  this.check();const g=copyPosition(position),side=g.turn(),moves=g.moves({verbose:true});
  const out:Report={position,best:null,score:null,depth:0,status:'error',alternatives:[],examined:0,legalCount:moves.length,played,classification:'uncertain',lossCp:null,comparable:false};
  if(g.isGameOver()){out.score=terminal(g);out.status='terminal';out.legalCount=0;return out;}
  const {q,res}=await this.search(g,revision,2,900);out.status=res.status;out.depth=res.completedDepth;
  if(res.score&&res.completedDepth>0&&res.move&&legalPV(q,res.pv)){const sanPV=sanLine(position,res.pv);if(sanPV?.length){out.score=whiteScore(res.score);out.best={move:res.move,san:sanPV[0],pv:res.pv,sanPV,score:out.score,depth:res.completedDepth,complete:res.status==='complete'&&res.completedDepth===2};}}
  if(!alternatives||!out.best)return out;
  const order=[...moves].sort((a,b)=>Number(Boolean(b.captured||b.promotion))-Number(Boolean(a.captured||a.promotion))||uci(a).localeCompare(uci(b)));
  const ids=[...new Set([out.best.move,...(played?[played]:[]),...order.map(uci)])].filter(u=>moves.some(m=>uci(m)===u)).slice(0,ALTERNATIVES);
  for(const u of ids){this.check();out.examined++;const child=copyPosition(position),m=child.move(moveInput(u));let score:WhiteScore|null=null,pv=[u],depth=0,complete=false;
   if(child.isGameOver()){score=terminal(child);if(score.kind==='mate')score={...score,plies:1};depth=2;complete=true;}
   else{const {q:cq,res:cr}=await this.search(child,revision,1,350);if(cr.score&&cr.completedDepth===1&&legalPV(cq,cr.pv)){score=whiteScore(cr.score,1);pv=[u,...cr.pv];depth=2;complete=cr.status==='complete';}}
   const sanPV=sanLine(position,pv);if(score&&sanPV?.length)out.alternatives.push({move:u,san:m.san,pv,sanPV,score,depth,complete});
  }
  out.alternatives.sort((a,b)=>utility(b.score,side)-utility(a.score,side)||a.move.localeCompare(b.move));
  const best=out.alternatives.find(l=>l.move===out.best?.move)??null,actual=out.alternatives.find(l=>l.move===played)??null;
  if(out.best.complete&&best?.complete&&utility(best.score,side)===utility(out.best.score,side)){const c=classify(best,actual,side);out.classification=c.label;out.lossCp=c.lossCp;out.comparable=c.comparable;}
  return out;
 }
 async review(t:ReplayTimeline,start:number,onRow:(ply:number,r:Report)=>void){for(let i=start;i<Math.min(t.moves.length,start+BATCH);i++){this.check();const g=replayPosition(t,i),r=await this.inspect(positionOf(g),i,uci(t.moves[i]),true);this.check();onRow(i,r);}}
}
export type Practice={version:string;position:Position;best:string;pv:string[]};
export function validatePractice(x:unknown):x is Practice{if(!x||typeof x!=='object')return false;const p=x as Practice;if(p.version!==VERSION||!p.position||!Array.isArray(p.pv)||p.pv.length>14||p.pv[0]!==p.best)return false;try{const g=copyPosition(p.position);return !g.isGameOver()&&g.moves({verbose:true}).some(m=>uci(m)===p.best)&&Boolean(sanLine(p.position,p.pv)?.length);}catch{return false;}}
export function practiceFrom(r:Report):Practice|null{if(!r.comparable||!['mistake','blunder','inaccuracy'].includes(r.classification)||!r.best?.complete||r.best.move===r.played)return null;const p={version:VERSION,position:r.position,best:r.best.move,pv:r.best.pv};return validatePractice(p)?p:null;}
export function readPractice(store:Store|undefined=storage()):Practice[]{try{const raw=store?.getItem(PRACTICE_KEY);if(!raw||raw.length>PRACTICE_CHARS)return [];const x=JSON.parse(raw);return Array.isArray(x)?x.slice(0,PRACTICE_CAP).filter(validatePractice):[];}catch{return [];}}
export function addPractice(p:Practice,store:Store|undefined=storage()){if(!validatePractice(p)||!store)return false;const key=JSON.stringify(p.position),items=[p,...readPractice(store).filter(x=>JSON.stringify(x.position)!==key)].slice(0,PRACTICE_CAP);while(JSON.stringify(items).length>PRACTICE_CHARS)items.pop();try{if(!items.length)return false;store.setItem(PRACTICE_KEY,JSON.stringify(items));return true;}catch{return false;}}
export function legalHint(g:Chess,move:string):Move|undefined{return g.isGameOver()?undefined:g.moves({verbose:true}).find(m=>uci(m)===move);}
