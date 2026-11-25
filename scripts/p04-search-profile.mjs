import {Chess} from 'chess.js';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {buildRequest} from '../src/ai/client.ts';
import {fixedSearch,runAdvanced} from '../src/ai/advanced.ts';
import {positionOf,legalPV,validResponse,uci} from '../src/ai/protocol.ts';
import {tacticalCorpus} from './p03-tactical-corpus.mjs';
import {profileBitboards} from './p04-bitboard-profile.mjs';
const prep=f=>{const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);return g;};
const rows=[],attempts=[];
const configurations=[{strategy:'advanced',label:'advanced',options:{}},{strategy:'optimized',label:'optimized',options:{}},{strategy:'optimized',label:'cache-disabled',options:{cache:false}}];
for(const f of [...tacticalCorpus,{id:'opening',moves:['e4','e5','Nf3','Nc6']}]) {
 const g=prep(f),before=positionOf(g);
 let matched=false;
 // The search contract explicitly aborts an iteration at a checked q-frontier.
 // Preserve every attempted depth, compare only completed equal-depth results.
 for(const depth of [2,1]){
  const runs=[];
  for(const config of configurations){
   const q=buildRequest(g,{searchId:'bench',gameId:'p04',revision:0},'analysis',config.strategy,2000,50000,7,depth);
   const at=performance.now();
   try{
    const x=fixedSearch(g,q,depth,()=>0,config.options),ms=performance.now()-at;
    assert.ok(legalPV(q,x.pv));assert.ok(x.nodes<=50000);
    runs.push({strategy:config.label,status:'complete',value:x.value,move:x.pv[0],nodes:x.nodes,ms,nps:x.nodes/(ms/1000),diagnostics:x.diagnostics});
   }catch(error){
    if(error?.reason!=='frontier-limit'&&error?.reason!=='node-limit')throw error;
    runs.push({strategy:config.label,status:'aborted',reason:error.reason,ms:performance.now()-at});
   }finally{assert.deepEqual(positionOf(g),before,f.id+' root restored');}
  }
  const completed=runs.filter(x=>x.status==='complete');
  for(const x of completed.slice(1)){assert.equal(x.value,completed[0].value,f.id+' score at '+depth);assert.equal(x.move,completed[0].move,f.id+' root at '+depth);}
  attempts.push({id:f.id,depth,runs});
  if(completed.length===configurations.length){rows.push({id:f.id,depth,runs});matched=true;break;}
 }
 assert.ok(matched,f.id+' no common completed depth');
}
assert.equal(rows.length,tacticalCorpus.length+1);
assert.ok(rows.filter(r=>r.depth===2).length>=5,'At least five common depth-two fixtures required');
const timed=[];
for(const f of tacticalCorpus){
 const g=prep(f),q=buildRequest(g,{searchId:'timed',gameId:'p04',revision:0},'analysis','optimized',1500,50000,7,3);
 const x=runAdvanced(q);
 assert.ok(validResponse(x,q,new Set(g.moves({verbose:true}).map(uci)),false),JSON.stringify(x));assert.ok(x.completedDepth>=1);
 const correct=f.expected?f.expected.includes(x.move):!f.avoid.includes(x.move);
 assert.ok(correct,f.id+' '+JSON.stringify(x));timed.push({id:f.id,move:x.move,depth:x.completedDepth,nodes:x.nodes,elapsed:x.elapsedMs,status:x.status,diagnostics:x.diagnostics});
}
const report={commit:process.env.GITHUB_SHA||'local',node:process.version,platform:process.platform,rows,attempts,timed,bitboards:profileBitboards()};
await mkdir('reports',{recursive:true});await writeFile('reports/p04-search-profile.json',JSON.stringify(report,null,2)+'\n');console.log('P04_PROFILE '+JSON.stringify(report));
