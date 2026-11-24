import {Chess} from 'chess.js';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {setImmediate as yieldLoop} from 'node:timers/promises';
import {buildRequest} from '../src/ai/client.ts';
import {runAdvanced} from '../src/ai/advanced.ts';
import {legalPV,validResponse,positionOf,uci} from '../src/ai/protocol.ts';
import {tacticalCorpus} from './p03-tactical-corpus.mjs';
import {CACHE_CAPACITY} from '../src/ai/transposition.ts';
if(!global.gc)throw Error('Use node --expose-gc');
const duration=Number(process.env.P04_SOAK_MS??1800000);
assert.ok(Number.isFinite(duration)&&duration>=1000);
const start=performance.now(),samples=[];let trials=0,nodes=0,engineMs=0,maxCache=0,maxPly=0,nextSample=0,evictions=0;
function sample(){global.gc();const m=process.memoryUsage();samples.push({elapsedMs:performance.now()-start,trials,nodes,heapUsed:m.heapUsed,rss:m.rss,external:m.external});console.log('P04_SOAK_SAMPLE '+JSON.stringify(samples.at(-1)));}
sample();nextSample=60000;
while(performance.now()-start<duration){
 const f=tacticalCorpus[trials%tacticalCorpus.length],g=f.fen?new Chess(f.fen):new Chess();
 for(const m of f.moves||[])g.move(m);
 const before=positionOf(g),q=buildRequest(g,{searchId:'soak',gameId:'p04',revision:trials},'analysis','optimized',250,5000,7,3);
 const x=runAdvanced(q);assert.ok(x.move&&validResponse(x,q,new Set(g.moves({verbose:true}).map(uci)),false));assert.ok(legalPV(q,x.pv));assert.deepEqual(positionOf(g),before);
 assert.ok(x.nodes<=5000);assert.ok(x.diagnostics.cacheSize<=CACHE_CAPACITY);assert.ok(x.diagnostics.peakPly<=14);
 maxCache=Math.max(maxCache,x.diagnostics.cacheSize);maxPly=Math.max(maxPly,x.diagnostics.peakPly);evictions+=x.diagnostics.cacheEvictions;nodes+=x.nodes;engineMs+=x.elapsedMs;trials++;
 if(performance.now()-start>=nextSample){sample();nextSample+=60000;}await yieldLoop();
}
sample();const elapsed=performance.now()-start;
const steady=samples.filter(s=>s.elapsedMs>=Math.min(300000,duration/3));
const baseline=steady[0]?.heapUsed??samples[0].heapUsed,final=samples.at(-1).heapUsed;
const growth=final-baseline,peak=Math.max(...samples.map(s=>s.heapUsed));
const report={commit:process.env.GITHUB_SHA||'local',durationRequestedMs:duration,elapsedMs:elapsed,trials,nodes,nodesPerSecond:nodes/(engineMs/1000),maxCache,maxPly,evictions,samples,postGcHeapGrowthBytes:growth,peakPostGcHeapBytes:peak,fullDuration:duration>=1800000&&elapsed>=1800000};
await mkdir('reports',{recursive:true});await writeFile('reports/p04-memory-soak.json',JSON.stringify(report,null,2)+'\n');console.log('P04_SOAK '+JSON.stringify(report));
assert.ok(growth<=8*1024*1024,'Post-GC retained heap grew >8 MiB');assert.ok(peak<=64*1024*1024,'Post-GC heap exceeded 64 MiB');if(process.env.CI)assert.ok(report.fullDuration,'30 minute gate required in CI');
