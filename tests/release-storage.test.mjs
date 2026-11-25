import test from 'node:test';import assert from 'node:assert/strict';import {loadJSON,saveJSON,STORAGE_KEYS} from '../src/game.ts';
test('release storage wrong-shape JSON recovery preserves raw original',()=>{
 const m=new Map();globalThis.localStorage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 for(const [key,raw,fallback] of [[STORAGE_KEYS.settings,'null',{}],[STORAGE_KEYS.guest,'42','Guest'],['gcu.royal-ui.v1','{"readIds":null}',{}],['gcu.puzzles.solved.v1','{}',[]]]){
  m.set(key,raw);assert.deepEqual(loadJSON(key,fallback),fallback);assert.equal(m.get(key),raw);assert.ok(saveJSON(key,fallback));assert.equal(m.get(key+'.recovery.v1'),raw);
 }
 const good={id:'old',endedAt:'2026-11-01T00:00:00Z',mode:'local',result:'white',pgn:'1. e4',moves:1};
 const mixed=JSON.stringify([null,good,{result:2}]);m.set(STORAGE_KEYS.history,mixed);assert.deepEqual(loadJSON(STORAGE_KEYS.history,[]),[good]);assert.ok(saveJSON(STORAGE_KEYS.history,[good]));assert.equal(m.get(STORAGE_KEYS.history+'.recovery.v1'),mixed);
 m.set(STORAGE_KEYS.history,'{"different":"corrupt"}');assert.equal(saveJSON(STORAGE_KEYS.history,[good]),false);assert.equal(m.get(STORAGE_KEYS.history),'{"different":"corrupt"}');
 delete globalThis.localStorage;
});
test('release storage refuses destructive recovery when backup write fails',()=>{
 let raw='null';globalThis.localStorage={getItem:k=>k===STORAGE_KEYS.settings?raw:null,setItem:(k,v)=>{if(k.endsWith('.recovery.v1'))throw Error('quota');raw=v;}};
 assert.equal(saveJSON(STORAGE_KEYS.settings,{}),false);assert.equal(raw,'null');delete globalThis.localStorage;
});
