import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {PRESETS,normalizeComputer,computerLimits,computerJob,undoCount,winForHuman} from '../src/computer-mode.ts';
import {runSearch} from '../src/ai/search.ts';
import {liveCandidate} from '../src/ai/client.ts';
import {advanceClock,newClock} from '../src/clock.ts';
import {validRequest} from '../src/ai/protocol.ts';
test('P05 presets are ordered bounded budgets not Elo',()=>{
 assert.deepEqual(Object.values(PRESETS).map(p=>p.timeMs),[100,300,750,1500]);
 assert.deepEqual(Object.values(PRESETS).map(p=>p.maxDepth),[1,2,3,5]);
 assert.equal(normalizeComputer({difficulty:'__proto__',thinkingMs:Infinity,playerSide:'x'}).difficulty,'medium');
 assert.equal(normalizeComputer({difficulty:'easy',thinkingMs:1500}).thinkingMs,100);
});
test('P05 remaining clock limits worker and safe default excludes pending optimized rollout',()=>{
 for(const difficulty of Object.keys(PRESETS)){const l=computerLimits({difficulty,playerSide:'b',thinkingMs:1500},190);assert.ok(l.timeMs<=70);assert.ok(l.maxNodes<=50000);}
 assert.equal(computerLimits({difficulty:'expert',playerSide:'w',thinkingMs:1500},1).timeMs,1);
});
test('P05 controller validates requests, cancels and rejects stale state for either side',async()=>{
 for(const playerSide of ['w','b']){
 const g=new Chess();if(playerSide==='w')g.move('e4');
 const id={searchId:'p05',gameId:'test',revision:1};let port,terminated=0;
 const job=computerJob(g,id,{difficulty:'easy',playerSide,thinkingMs:100},null,undefined,()=>port={onmessage:null,onerror:null,onmessageerror:null,postMessage(q){assert.ok(validRequest(q));queueMicrotask(()=>this.onmessage?.({data:runSearch(q,()=>0)}));},terminate(){terminated++;}});
 const r=await job.promise;assert.ok(liveCandidate(g,job.request,r,id));assert.equal(terminated,1);
 g.move(liveCandidate(g,job.request,r,id));assert.equal(liveCandidate(g,job.request,r,id),undefined);
 const cancelled=computerJob(g,{...id,revision:2},{difficulty:'easy',playerSide,thinkingMs:100},null,undefined,()=>port={onmessage:null,onerror:null,onmessageerror:null,postMessage(){},terminate(){terminated++;}});
 cancelled.cancel();assert.equal((await cancelled.promise).status,'cancelled');
 }
});
test('P05 undo returns to human decision, including black initial computer move',()=>{
 const g=new Chess();assert.equal(undoCount(g,'computer','b'),0);g.move('e4');assert.equal(undoCount(g,'computer','b'),0);
 g.move('e5');assert.equal(undoCount(g,'computer','b'),1);g.move('Nf3');assert.equal(undoCount(g,'computer','b'),2);
 assert.equal(undoCount(g,'computer','w'),1);assert.equal(undoCount(g,'local','w'),1);
});
test('P05 match statistics honor human color and timeout loser',()=>{
 assert.equal(winForHuman({result:'white'}),true);assert.equal(winForHuman({result:'black',playerSide:'b'}),true);
 assert.equal(winForHuman({result:'timeout-white',playerSide:'b'}),true);assert.equal(winForHuman({result:'timeout-black',playerSide:'b'}),false);
});
test('P05 clock settlement flags before bot move; paused interval rebased without refund',()=>{
 const a=advanceClock(newClock(0,100),100);assert.equal(a.flagged,'w');assert.equal(a.state.remainingMs[0],0);
 const p=advanceClock(newClock(0,1000),200).state;const resumed={...p,lastAt:10000};assert.equal(advanceClock(resumed,10100).state.remainingMs[0],700);
});
test('P05 missing worker returns legal fallback and no fake score',async()=>{
 const g=new Chess(),job=computerJob(g,{searchId:'p05',gameId:'fallback',revision:0},{difficulty:'medium',playerSide:'b',thinkingMs:300},null,undefined,()=>{throw Error('unavailable');});
 const r=await job.promise;assert.equal(r.status,'fallback');assert.equal(r.score,null);assert.ok(liveCandidate(g,job.request,r,job.request));
});
