import {Chess} from 'chess.js';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {buildRequest} from '../src/ai/client.ts';
import {fixedSearch,runAdvanced} from '../src/ai/advanced.ts';
import {positionOf,legalPV,validResponse,uci} from '../src/ai/protocol.ts';
import {tacticalCorpus} from './p03-tactical-corpus.mjs';
import {profileBitboards} from './p04-bitboard-profile.mjs';
const prep=f=>{const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);return g;};
const rows=[];
for(const f of [...tacticalCorpus,{id:'opening',moves:['e4','e5','Nf3','Nc6']}]) {
 const g=prep(f),before=positionOf(g),runs=[];
 for(const strategy of ['advanced','optimized']){
  const q=buildRequest(g,{searchId:'bench',gameId:'p04',revision:0},'analysis',strategy,2000,50000,7,2);
  const at=performance.now(),x=fixedSearch(g,q,2,()=>0),ms=performance.now()-at;
  assert.ok(legalPV(q,x.pv));assert.deepEqual(positionOf(g),before);
  runs.push({strategy,value:x.value,move:x.pv[0],nodes:x.nodes,ms,nps:x.nodes/(ms/1000),diagnostics:x.diagnostics});
 }
 assert.equal(runs[0].value,runs[1].value,f.id);assert.equal(runs[0].move,runs[1].move,f.id);rows.push({id:f.id,runs});
}
const timed=[];
for(const f of tacticalCorpus){
 const g=prep(f),q=buildRequest(g,{searchId:'timed',gameId:'p04',revision:0},'analysis','optimized',1500,50000,7,3);
 const x=runAdvanced(q);
 assert.ok(validResponse(x,q,new Set(g.moves({verbose:true}).map(uci)),false),JSON.stringify(x));assert.ok(x.completedDepth>=1);
 const correct=f.expected?f.expected.includes(x.move):!f.avoid.includes(x.move);
 assert.ok(correct,f.id+' '+JSON.stringify(x));timed.push({id:f.id,move:x.move,depth:x.completedDepth,nodes:x.nodes,elapsed:x.elapsedMs,status:x.status,diagnostics:x.diagnostics});
}
const report={commit:process.env.GITHUB_SHA||'local',node:process.version,platform:process.platform,rows,timed,bitboards:profileBitboards()};
await mkdir('reports',{recursive:true});await writeFile('reports/p04-search-profile.json',JSON.stringify(report,null,2)+'\n');console.log('P04_PROFILE '+JSON.stringify(report));
