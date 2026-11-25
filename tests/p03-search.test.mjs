import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {buildRequest,startJob,liveCandidate} from '../src/ai/client.ts';
import {runSearch} from '../src/ai/search.ts';
import {fixedSearch,MATE} from '../src/ai/advanced.ts';
import {evaluate} from '../src/ai/evaluation.ts';
import {MAX_Q_PLY,MAX_PV,positionOf,validRequest,validResponse,legalPV,uci} from '../src/ai/protocol.ts';
import {tacticalCorpus,passes} from '../scripts/p03-tactical-corpus.mjs';
const id={searchId:'p03',gameId:'test',revision:0};
const prep=f=>{const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);return g;};
const req=(g,depth=3,nodes=50000,ms=2000)=>buildRequest(g,id,'play','advanced',ms,nodes,7,depth);
const legal=g=>new Set(g.isGameOver()?[]:g.moves({verbose:true}).map(uci));
const zero=()=>0;
// Independent exhaustive minimax with the same finite quiet frontier, no alpha/beta or engine ordering.
function brute(g,depth,ply=0,q=0){
  if(g.isCheckmate())return -MATE+ply;
  if(g.isDraw())return 0;
  const checked=g.isCheck(),all=g.moves({verbose:true});
  if(!all.length)return 0;
  let best=-Infinity;
  if(depth===0&&!checked){best=evaluate(g,g.turn()).total;if(q===MAX_Q_PLY)return best;}
  if(depth===0&&checked&&q===MAX_Q_PLY)throw Error('Reference unresolved frontier');
  const moves=depth>0||checked?all:all.filter(m=>m.captured||m.promotion);
  for(const m of moves){g.move(m);try{best=Math.max(best,-brute(g,Math.max(0,depth-1),ply+1,depth===0?q+1:0));}finally{g.undo();}}
  return best;
}
test('P03-T01 alpha beta matches exhaustive shallow minimax, side perspective and mate distance',()=>{
  for(const f of [tacticalCorpus[4],tacticalCorpus[6],{fen:'7k/8/8/8/8/8/P7/7K w - - 0 1'}]){
    const g=prep(f),before=positionOf(g);
    for(const d of [1,2]){const a=fixedSearch(g,req(g,d),d,zero);assert.equal(a.value,brute(g,d),f.id);assert.deepEqual(positionOf(g),before);}
  }
  const m=prep(tacticalCorpus[0]),a=runSearch(req(m),zero);assert.equal(a.score.kind,'mate');assert.equal(a.score.plies,1);assert.equal(a.score.winner,'b');
});
test('P03-T02 terminal and history-aware draw, mate priority at halfmove 100',()=>{
  const g=new Chess();for(const m of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'])g.move(m);
  for(const position of [g,new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'),new Chess('7k/8/8/8/8/8/R7/7K w - - 100 51'),new Chess('7k/8/8/8/8/8/8/7K w - - 0 1')]){
    const a=runSearch(req(position),zero);assert.equal(a.status,'terminal');assert.equal(a.move,null);assert.equal(a.score.value,0);
  }
  const mate=new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 100 51');
  assert.equal(runSearch(req(mate),zero).score.kind,'mate');
});
test('P03-T03 interruption returns the last fully completed iteration, never partial score',()=>{
  const g=new Chess(),one=runSearch(req(g,1),zero),two=runSearch(req(g,3,one.nodes+1),zero);
  assert.equal(one.status,'complete');assert.equal(two.status,'timeout');assert.equal(two.reason,'node-limit');assert.equal(two.completedDepth,1);
  for(const key of ['move','pv','score'])assert.deepEqual(two[key],one[key]);
  const early=runSearch(req(g,3,1),zero);assert.equal(early.completedDepth,0);assert.equal(early.score,null);
});
test('P03-T04 quiet search includes checked evasion, promotion, recapture and bounded stack',()=>{
  const g=prep(tacticalCorpus[4]),line=fixedSearch(g,req(g),0,zero);
  assert.equal(line.pv[0],'h1g1');assert.ok(line.peakPly<=MAX_Q_PLY);
  const prom=prep(tacticalCorpus[5]),q=fixedSearch(prom,req(prom),0,zero);assert.equal(q.pv[0],'a7b8q');
  const quietProm=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.equal(fixedSearch(quietProm,req(quietProm),0,zero).pv[0],'a7a8q');
  const trap=prep(tacticalCorpus[3]),s=runSearch(req(trap,1),zero);assert.ok(passes(tacticalCorpus[3],s.move));
});
test('P03-T05 monotonic deadline 1ms, multi-second budget, node limits and actual client hard stop',async()=>{
  const g=new Chess();let n=0;const a=runSearch(req(g,3,50000,1),()=>n+=2);
  assert.equal(a.status,'timeout');assert.equal(a.reason,'deadline');assert.equal(a.completedDepth,0);
  const long=runSearch(req(g,6,50000,2000),(()=>{let t=0;return()=>t+=25;})());
  assert.equal(long.status,'timeout');assert.equal(long.reason,'deadline');assert.ok(long.elapsedMs>=2000&&long.elapsedMs<2200);
  const port={onmessage:null,onerror:null,onmessageerror:null,terminated:0,postMessage(){},terminate(){this.terminated++;}};
  const job=startJob(req(g,3,50000,1),legal(g),false,()=>port),r=await job.promise;
  assert.equal(r.status,'fallback');assert.equal(port.terminated,1);assert.equal(r.completedDepth,0);assert.ok(legal(g).has(r.move));
});
test('P03-T06 full PV replay, illegal tail and forged mate rejected; stable history',()=>{
  const g=prep(tacticalCorpus[3]),q=req(g,2),r=runSearch(q,zero);
  assert.ok(r.completedDepth>0);assert.ok(legalPV(q,r.pv));assert.ok(validResponse(r,q,legal(g),false));assert.ok(liveCandidate(g,q,r,id));
  assert.equal(validResponse({...r,pv:[r.move,'a1a8']},q,legal(g),false),false);
  assert.equal(validResponse({...r,score:{kind:'mate',winner:'w',perspective:'w',plies:r.pv.length}},q,legal(g),false),false);
  assert.equal(validRequest({...q,limits:{...q.limits,maxDepth:7}}),false);
  assert.equal(validRequest({...q,limits:{...q.limits,maxNodes:50001}}),false);
  assert.equal(legalPV(q,Array(MAX_PV+1).fill(r.move)),false);
});
// Separate legal force-mate oracle, independent of evaluation and negamax.
function forced(g,attacker,remaining){
  if(g.isCheckmate())return g.turn()!==attacker;
  if(g.isDraw()||!remaining)return false;
  const attacking=g.turn()===attacker;
  for(const move of g.moves({verbose:true})){g.move(move);let win;try{win=forced(g,attacker,remaining-1);}finally{g.undo();}
    if(win===attacking)return attacking;}
  return !attacking;
}
test('P03-T07 independently verify mate-in-two and tactical corpus',()=>{
  const f=tacticalCorpus[1],g=prep(f),solutions=[];
  assert.equal(forced(g,'w',1),false);
  for(const m of g.moves({verbose:true})){g.move(m);try{if(forced(g,'w',2))solutions.push(uci(m));}finally{g.undo();}}
  assert.deepEqual(solutions.sort(),[...f.expected].sort());
  const a=runSearch(req(g,3),zero);
  assert.equal(a.score?.kind,'mate');assert.equal(a.score.plies,3);assert.ok(passes(f,a.move));
  for(const f of tacticalCorpus.filter(f=>f.id!=='mate-two')){
    const g=prep(f),before=positionOf(g),a=runSearch(req(g,2),zero);
    assert.ok(a.move&&passes(f,a.move),f.id+' '+JSON.stringify(a));assert.ok(legalPV(req(g,2),a.pv));assert.deepEqual(positionOf(g),before);
  }
});
test('P03-T08 deterministic paired fixed-seed baseline versus advanced, bounded nodes and PV',()=>{
  let baseline=0,advanced=0;
  for(const f of tacticalCorpus){
    const g=prep(f),q=req(g,3);
    const old=runSearch(buildRequest(g,id,'play','foundation',2000,256,7),zero),a=runSearch(q,zero),b=runSearch(q,zero);
    assert.deepEqual(a,b);assert.ok(legalPV(q,a.pv));assert.ok(a.nodes<=q.limits.maxNodes);
    baseline+=Number(passes(f,old.move));advanced+=Number(passes(f,a.move));
  }
  assert.ok(advanced>baseline,'Expected fixed-suite improvement: '+baseline+' -> '+advanced);
});
