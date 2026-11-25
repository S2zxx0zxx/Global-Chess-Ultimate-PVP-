import test from 'node:test';import assert from 'node:assert/strict';import {Chess} from 'chess.js';
import {FeedbackController,normalizeFeedback,synthesize,CUES,MAX_VOICES,WebAudioPort} from '../src/gameplay-feedback.ts';
import {committedEvents,endedEvent} from '../src/gameplay-events.ts';
import {shareGame,safeShareUrl,VERIFIED_STORE_URL} from '../src/share-game.ts';
test('P08 original cues bounded PCM, deterministic, no clipping and nonzero audio',()=>{
 for(const cue of CUES){const a=synthesize(cue),b=synthesize(cue);assert.deepEqual(a,b);assert.ok(a.length<=7680);assert.ok(a.some(x=>Math.abs(x)>.02));assert.ok(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=.38));assert.equal(a[0],0);assert.equal(a.at(-1),0);}
 assert.equal(MAX_VOICES,2);
});
test('P08 preferences migration, clamping and explicit consent',()=>{
 assert.deepEqual(normalizeFeedback(null,true),{sound:false,volume:.55,resultVolume:.65,haptics:true});
 assert.deepEqual(normalizeFeedback({sound:'true',volume:999,resultVolume:NaN,haptics:1}),{sound:false,volume:1,resultVolume:.65,haptics:false});
});
test('P08 canonical one cue per move and result; duplicate, stale, replay and mute safe',async()=>{
 const plays=[],buzz=[];let unlocks=0,stops=0,disposed=0;
 const f=new FeedbackController(()=>({unlock:async()=>{unlocks++;return true;},play:(c,g)=>{plays.push([c,g]);return true;},stop:()=>stops++,dispose:()=>disposed++}),x=>buzz.push(x),()=>false);
 f.begin('g',true);assert.deepEqual(plays,[]);assert.equal(unlocks,0);
 f.configure(normalizeFeedback({sound:true,volume:.5,resultVolume:.25,haptics:true}));await f.unlock();
 f.begin('g',true);f.preview('pick');f.preview('invalid');
 const g=new Chess('4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1'),m=g.move('Rxd5'),e=committedEvents(g,m,'g',1,'human');
 f.commit(e);f.commit(e);f.commit(committedEvents(g,m,'other',2,'computer'));f.finish(endedEvent('g',2,'white'));f.finish(endedEvent('g',2,'white'));f.commit(e);
 assert.deepEqual(plays,[['start',.5],['pick',.5],['invalid',.5],['capture',.5],['result',.25]]);assert.equal(buzz.length,5);
 f.configure(normalizeFeedback({sound:false,haptics:false}));f.begin('next',true);assert.equal(plays.length,5);assert.ok(stops>0);f.dispose();assert.equal(disposed,1);
});
test('P08 reduced motion and failed audio never prevent gameplay',async()=>{
 let buzz=0;const f=new FeedbackController(()=>({unlock:async()=>{throw Error('blocked');},play:()=>{throw Error('bad');},stop(){},dispose(){}}),()=>buzz++,()=>true);
 f.configure(normalizeFeedback({sound:true,haptics:true}));assert.equal(await f.unlock(),false);f.begin('g',true);f.preview('invalid');assert.equal(buzz,0);f.dispose();
});
test('P08 invalid, cancel and old-match pending audio suppressed',async()=>{
 let release,played=0;const f=new FeedbackController(()=>({unlock:()=>new Promise(r=>release=r),play:()=>{played++;return true;},stop(){},dispose(){}}));
 f.configure(normalizeFeedback({sound:true}));const p=f.unlock();f.begin('old',true);f.stop();release(true);await p;await Promise.resolve();assert.equal(played,0);f.dispose();
});
test('P08 share is canonical origin only, cancel never silently copies, no fake store URL',async()=>{
 assert.equal(safeShareUrl('https://example.com/?room=secret'),'https://example.com/');assert.equal(safeShareUrl('javascript:alert(1)'),null);assert.equal(VERIFIED_STORE_URL,null);
 let copied='';assert.equal(await shareGame({clipboard:{writeText:async s=>{copied=s;}}},'https://example.com/x'),'copied');assert.equal(copied,'https://example.com/');
 assert.equal(await shareGame({share:async()=>{throw {name:'AbortError'};},clipboard:{writeText:async()=>{throw Error('must not copy');}}},'https://example.com'),'cancelled');
 assert.equal(await shareGame({},'https://example.com'),'unavailable');
});

test('P08 unlock pending cues bounded to newest and uses current gain',async()=>{
 let release;const calls=[];const f=new FeedbackController(()=>({unlock:()=>new Promise(r=>release=r),play:(c,g)=>{calls.push([c,g]);return true;},stop(){},dispose(){}}));
 f.configure(normalizeFeedback({sound:true,volume:.3}));const p=f.unlock();f.begin('g',true);for(let i=0;i<1000;i++)f.preview('pick');f.preview('invalid');f.configure(normalizeFeedback({sound:true,volume:.8}));release(true);await p;assert.deepEqual(calls,[['invalid',.8]]);f.dispose();
});
test('P08 WebAudio port enforces voice cap, release and disposal',async()=>{
 const old=globalThis.AudioContext;let closed=0,stops=0;const sources=[];
 class FakeContext{state='running';destination={};createBuffer(c,n){const a=new Float32Array(n);return {getChannelData:()=>a};}createBufferSource(){const s={connect(){},disconnect(){},start(){},stop(){stops++;},onended:null};sources.push(s);return s;}createGain(){return {gain:{value:0},connect(){},disconnect(){}};}async close(){closed++;}}
 globalThis.AudioContext=FakeContext;
 try{const p=new WebAudioPort();assert.ok(await p.unlock());assert.ok(p.play('move',.5));assert.ok(p.play('result',.5));assert.equal(p.play('pick',.5),false);sources[0].onended();assert.ok(p.play('pick',.5));p.dispose();assert.equal(stops,2);assert.equal(closed,1);assert.equal(p.play('move',.5),false);}
 finally{if(old===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=old;}
});
