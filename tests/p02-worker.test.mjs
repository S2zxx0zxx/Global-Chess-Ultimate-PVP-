import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { buildRequest, startJob, liveCandidate } from '../src/ai/client.ts';
import { reconstruct, validRequest, validResponse, positionOf, samePosition, uci, result } from '../src/ai/protocol.ts';
import { evaluate } from '../src/ai/evaluation.ts';
import { runSearch } from '../src/ai/search.ts';
const id={searchId:'test-1',gameId:'game-1',revision:3};
const request=(g=new Chess(),timeMs=2000,nodes=256,seed=7,strategy='foundation')=>buildRequest(g,id,'play',strategy,timeMs,nodes,seed);
const legal=g=>new Set(g.isGameOver()?[]:g.moves({verbose:true}).map(uci));
function mock(){
  return {onmessage:null,onerror:null,onmessageerror:null,terminated:0,posts:0,
    postMessage(){this.posts++;},terminate(){this.terminated++;}};
}
test('P02-T01 typed protocol rejects malformed bounds, IDs, version and result payloads',()=>{
  const g=new Chess(),req=request(g);
  assert.ok(validRequest(req));
  for(const patch of [{protocol:2},{type:'bad'},{searchId:''},{revision:-1},{seed:2**32},{strategy:'other'},{purpose:'online'},
    {limits:{...req.limits,timeMs:0}},{limits:{...req.limits,maxDepth:2}},{limits:{...req.limits,maxNodes:257}},
    {position:{...req.position,moves:Array(1025).fill('e2e4')}},{position:{...req.position,moves:['a1a8x']}},
    {position:{...req.position,fen:'bad'}}])assert.equal(validRequest({...req,...patch}),false);
  const res=runSearch(req);
  assert.ok(validResponse(res,req,legal(g),false));
  for(const patch of [{searchId:'stale'},{revision:4},{move:'a1a8'},{pv:['a1a8']},{completedDepth:2},{nodes:257},{elapsedMs:NaN},{score:{kind:'cp',value:Infinity,perspective:'w'}},{status:'terminal'}])
    assert.equal(validResponse({...res,...patch},req,legal(g),false),false);
});
test('P02-T02 lifecycle exactly-once completion, cancellation, errors and late callbacks',async()=>{
  const g=new Chess(),req=request(g),port=mock();
  const job=startJob(req,legal(g),false,()=>port),late=port.onmessage;
  job.cancel();late({data:runSearch(req)});
  assert.equal((await job.promise).status,'cancelled');assert.equal(port.terminated,1);
  const p2=mock(),j2=startJob(req,legal(g),false,()=>p2),cb=p2.onmessage;
  cb({data:runSearch(req)});cb({data:runSearch(req)});j2.cancel();
  assert.equal((await j2.promise).status,'complete');assert.equal(p2.terminated,1);
  const p3=mock(),j3=startJob(req,legal(g),false,()=>p3);p3.onerror({preventDefault(){}});
  assert.equal((await j3.promise).reason,'worker-error');assert.equal(p3.terminated,1);
});
test('P02-T03 worker reconstructs history, repetition, counters and custom positions; rejects illegal replays',()=>{
  const g=new Chess();for(const m of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'])g.move(m);
  const req=request(g),rebuilt=reconstruct(req);
  assert.ok(rebuilt.isThreefoldRepetition());assert.deepEqual(positionOf(rebuilt),positionOf(g));
  const ended=runSearch(req);assert.equal(ended.status,'terminal');assert.equal(ended.move,null);
  const custom=new Chess('7k/8/8/8/8/8/R7/7K b - - 98 42');custom.move('Kg8');
  assert.equal(reconstruct(request(custom)).fen(),custom.fen());
  assert.throws(()=>reconstruct({...request(),position:{...request().position,moves:['e2e5']}}));
  assert.throws(()=>reconstruct({...request(),position:{...request().position,fen:custom.fen()}}));
  assert.equal(samePosition(new Chess(g.fen()),positionOf(g)),false);
});
test('P02-T04 independent centipawn material, perspective symmetry and terminal scoring',()=>{
  const g=new Chess('7k/8/8/8/8/8/Q7/7K w - - 0 1');
  assert.equal(evaluate(g,'w').material,900);assert.equal(evaluate(g,'b').material,-900);
  assert.equal(evaluate(new Chess()).total,0);
  const mate=new Chess();for(const m of ['f3','e5','g4','Qh4#'])mate.move(m);
  const res=runSearch(request(mate));assert.equal(res.status,'terminal');assert.equal(res.move,null);assert.deepEqual(res.score,{kind:'mate',winner:'b',plies:0,perspective:'w'});
});
test('P02-T05 original positional terms, mirrored board and endgame phase',()=>{
  const a=new Chess('4k3/pp6/8/3N4/8/8/2P5/4K3 w - - 0 1');
  const b=new Chess('4k3/2p5/8/8/3n4/8/PP6/4K3 b - - 0 1');
  const x=evaluate(a),y=evaluate(b);
  for(const k of ['material','position','mobility','pawns','kingSafety','total'])assert.equal(x[k]+y[k],0,k);
  assert.equal(x.phase,y.phase);
  assert.equal(evaluate(new Chess()).phase,24);
  const center=new Chess('7k/8/8/8/3K4/8/R7/8 w - - 0 1'),edge=new Chess('7k/8/8/8/8/8/R7/K7 w - - 0 1');
  assert.ok(evaluate(center).position>evaluate(edge).position);
});
test('P02-T06 deterministic component sum, seeded result and one-ply PV, root remains unchanged',()=>{
  const g=new Chess(),before=positionOf(g),req=request(g);
  const ev=evaluate(g);assert.equal(ev.total,ev.material+ev.position+ev.mobility+ev.pawns+ev.kingSafety);
  const a=runSearch(req),b=runSearch(req);
  assert.equal(a.status,'complete');assert.equal(a.completedDepth,1);assert.equal(a.nodes,20);
  for(const k of ['move','pv','score','nodes','completedDepth'])assert.deepEqual(a[k],b[k],k);
  assert.ok(legal(g).has(a.move));assert.deepEqual(a.pv,[a.move]);assert.deepEqual(positionOf(g),before);
  const mate=new Chess();for(const m of ['f3','e5','g4'])mate.move(m);
  assert.equal(runSearch(request(mate)).move,'d8h4');
});
test('P02-T07 deadlines, node cap, fallback without fake depth/score, terminal and unavailable worker',async()=>{
  const g=new Chess(),req=request(g,1),timeout=runSearch(req,(()=>{let n=0;return()=>n+=2;})());
  assert.equal(timeout.status,'timeout');assert.equal(timeout.completedDepth,0);assert.equal(timeout.score,null);
  const cap=runSearch(request(g,2000,1));assert.equal(cap.status,'timeout');assert.equal(cap.reason,'node-limit');assert.equal(cap.nodes,1);assert.ok(legal(g).has(cap.move));
  const port=mock(),job=startJob(req,legal(g),false,()=>port),res=await job.promise;
  assert.equal(res.status,'fallback');assert.equal(res.reason,'deadline');assert.equal(res.score,null);assert.equal(res.completedDepth,0);assert.ok(legal(g).has(res.move));assert.equal(port.terminated,1);
  const unavailable=await startJob(req,legal(g),false,()=>{throw Error('unavailable');}).promise;
  assert.equal(unavailable.reason,'unavailable');assert.ok(legal(g).has(unavailable.move));
  const terminal=new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  const fallback=await startJob(request(terminal),legal(terminal),true,()=>{throw Error('unavailable');}).promise;
  assert.equal(fallback.move,null);assert.deepEqual(fallback.pv,[]);
});
test('P02-T08 stale game/revision/history and malformed responses cannot commit; legacy compatibility',async()=>{
  const g=new Chess(),req=request(g),res=runSearch(req);
  assert.ok(liveCandidate(g,req,res,id));assert.equal(liveCandidate(g,req,res,{...id,revision:4}),undefined);
  assert.equal(liveCandidate(g,req,res,{...id,gameId:'replacement'}),undefined);
  g.move('e4');assert.equal(liveCandidate(g,req,res,id),undefined);g.undo();
  const p=mock(),job=startJob(req,legal(g),false,()=>p);p.onmessage({data:{...res,move:'a1a8'}});
  const rejected=await job.promise;assert.equal(rejected.reason,'invalid-response');assert.ok(legal(g).has(rejected.move));
  const old=runSearch(request(g,2000,256,0,'legacy'));assert.equal(old.status,'complete');assert.equal(old.score,null);assert.equal(old.completedDepth,0);assert.ok(legal(g).has(old.move));
});
