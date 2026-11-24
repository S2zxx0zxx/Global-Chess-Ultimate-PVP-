import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {Ordering,PositionContext,captureRank,HISTORY_CAP,KILLER_SLOTS,repetitionKey} from '../src/ai/ordering.ts';
import {TranspositionCache,normalizeMate,restoreMate,boundFor,CACHE_CAPACITY} from '../src/ai/transposition.ts';
import {fixedSearch,runAdvanced} from '../src/ai/advanced.ts';
import {buildRequest} from '../src/ai/client.ts';
import {legalPV,positionOf,uci,validResponse} from '../src/ai/protocol.ts';
import {tacticalCorpus} from '../scripts/p03-tactical-corpus.mjs';
const id={searchId:'p04',gameId:'test',revision:0};
const req=(g,strategy='optimized',depth=2,nodes=50000)=>buildRequest(g,id,'analysis',strategy,2000,nodes,7,depth);
const zero=()=>0;
const prep=f=>{const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);return g;};
test('P04-T01 MVV-LVA orders victim/attacker, en passant and promotion; deterministic legal set',()=>{
 const g=new Chess('4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1'),moves=g.moves({verbose:true}),o=new Ordering(7);
 assert.equal(uci(o.order(moves,1)[0]),'d3d5');
 const ep=new Chess();for(const s of ['e4','a6','e5','d5'])ep.move(s);
 assert.ok(captureRank(ep.moves({verbose:true}).find(m=>m.isEnPassant()))>0);
 const prom=new Chess('1r5k/P7/8/8/8/8/8/7K w - - 0 1'),p=prom.moves({verbose:true});
 assert.equal(uci(o.order(p,1)[0]),'a7b8q');
 assert.deepEqual(o.order(p,1).map(uci),o.order(p,1).map(uci));
 assert.deepEqual(o.order(p,1).map(uci).sort(),p.map(uci).sort());
});
test('P04-T02 two quiet killers per ply, no capture inserted, isolated jobs',()=>{
 const g=new Chess(),m=g.moves({verbose:true}),o=new Ordering(7);
 for(const u of ['e2e4','d2d4','g1f3'])o.reward(m.find(x=>uci(x)===u),1,3);
 assert.equal(o.killers.length,KILLER_SLOTS);assert.deepEqual(o.killers[1],['g1f3','d2d4']);
 assert.equal(uci(o.order(m,1)[0]),'g1f3');assert.deepEqual(new Ordering(7).killers[1],[null,null]);
 assert.equal(o.order(m,1,'a1a8').some(x=>uci(x)==='a1a8'),false);
});
test('P04-T03 history saturates, decays, side/from/to bounded and resets',()=>{
 const g=new Chess(),m=g.moves({verbose:true})[0],o=new Ordering(1);
 for(let i=0;i<1000;i++)o.reward(m,2,6);
 assert.equal(Math.max(...o.history),HISTORY_CAP);assert.equal(o.history.length,8192);
 o.decay();assert.equal(Math.max(...o.history),HISTORY_CAP/2);
 assert.equal(Math.max(...new Ordering(1).history),0);
});
test('P04-T04 identity includes castling, turn, legal EP, halfmove and repetition context',()=>{
 const a=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
 const key=g=>new PositionContext(g).identity(g);
 for(const f of [a.fen().replace('KQkq','-'),a.fen().replace(' w ',' b '),a.fen().replace(' 0 1',' 1 1')])assert.notEqual(key(a),key(new Chess(f)));
 const ep=prep({moves:['e4','a6','e5','d5']});assert.notEqual(key(ep),key(new Chess(ep.fen().replace(' d6 ',' - '))));
 const pinned=new Chess('8/8/8/r4pPK/8/8/8/4k3 w - f6 0 1');assert.equal(repetitionKey(pinned.fen()).split(' ')[3],'-');
 const g=prep({moves:['Nf3','Nf6','Ng1','Ng8']});assert.notEqual(key(g),key(new Chess(g.fen())));
 const ctx=new PositionContext(g),before=ctx.identity(g),m=g.move('e4'),undo=ctx.push(m);
 assert.equal(ctx.identity(g),key(g));undo();g.undo();assert.equal(ctx.identity(g),before);
});
test('P04-T05 depth/bounds, mate normalization, full collision check and eviction cap',()=>{
 const c=new TranspositionCache(1,7,()=>0);c.store('a',2,99995,'exact',['e2e4'],3);
 assert.equal(c.usable(c.probe('a'),2,-Infinity,Infinity,1),99997);
 assert.equal(c.usable(c.probe('a'),3,-Infinity,Infinity,1),undefined);
 assert.equal(c.probe('b'),undefined);assert.equal(c.collisions,1);
 c.store('b',1,30,'lower',['d2d4'],0);assert.equal(c.size,1);assert.equal(c.evictions,1);
 assert.equal(c.usable(c.probe('b'),1,0,20,0),30);assert.equal(c.usable(c.probe('b'),1,0,40,0),undefined);
 c.store('c',1,-10,'upper',['a2a4'],0);assert.equal(c.usable(c.probe('c'),1,0,40,0),-10);
 assert.equal(normalizeMate(-99995,3),-99998);assert.equal(restoreMate(-99998,1),-99997);
 assert.equal(boundFor(0,0,1),'upper');assert.equal(boundFor(1,0,1),'lower');assert.equal(boundFor(.5,0,1),'exact');
 const big=new TranspositionCache();for(let i=0;i<5000;i++)big.store('position-'+i,1,i,'exact',['e2e4'],0);
 assert.ok(big.size<=CACHE_CAPACITY);assert.ok(big.evictions>0);
});
test('P04-T06 fixed-depth root choice and score parity; cache on/off; every PV legal',()=>{
 for(const f of [tacticalCorpus[0],tacticalCorpus[3],tacticalCorpus[4],tacticalCorpus[6],{moves:[]}]){
  const g=prep(f),before=positionOf(g),base=fixedSearch(g,req(g,'advanced'),2,zero);
  for(const opt of [{},{cache:false},{ordering:false}]){
   const x=fixedSearch(g,req(g),2,zero,opt);
   assert.equal(x.value,base.value,f.id);assert.equal(x.pv[0],base.pv[0],f.id);
   assert.ok(legalPV(req(g),x.pv));assert.deepEqual(positionOf(g),before);assert.ok(x.diagnostics.cacheSize<=CACHE_CAPACITY);
  }
 }
});
test('P04-T07 canonical move generator remains unchanged (perft regression)',()=>{
 const g=new Chess();assert.equal(g.perft(3),8902);
 const k=new Chess('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');assert.equal(k.perft(2),2039);
});
test('P04-T08 repeated bounded searches deterministic, no stale cache or mutation',()=>{
 const g=prep(tacticalCorpus[4]),q=req(g,'optimized',2),before=positionOf(g),a=runAdvanced(q,zero);
 assert.ok(a.completedDepth>=1);assert.ok(validResponse(a,q,new Set(g.moves({verbose:true}).map(uci)),false));
 for(let i=0;i<20;i++){const x=runAdvanced(q,zero);assert.deepEqual(x,a);assert.deepEqual(positionOf(g),before);assert.ok(x.diagnostics.cacheSize<=CACHE_CAPACITY);}
});
