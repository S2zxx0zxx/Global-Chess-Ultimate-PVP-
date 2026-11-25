import {readFileSync,readdirSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import assert from 'node:assert/strict';import {compileClip,sampleClip,cubic,eventsBetween} from './ad07_evaluator.mjs';
const [dir,out]=process.argv.slice(2);const clips=readdirSync(dir).filter(n=>n.endsWith('.json'));let stats={clips:0,channels:0,keys:0,segments:0,stepJumps:0,maxContinuousEndpointDelta:0,directKeys:0,events:0,sampledFrames:0,scalarSamples:0};
for(const f of clips){const c=JSON.parse(readFileSync(join(dir,f),'utf8')),v=compileClip(c);stats.clips++;stats.channels+=v.tracks.length+v.constants.length;
 for(let j=0;j<v.tracks.length;j++){const a=v.tracks[j].timed;for(let i=0;i<a.length;i++){const k=a[i];assert.equal(sampleClip(v,k.time).channels[j],k.co[3]);stats.keys++;if(i+1<a.length){const n=a[i+1],delta=Math.abs(cubic(k.co,n.time-k.time)-n.co[3]);stats.segments++;if(k.co.slice(0,3).every(x=>x===0)){if(delta>0.001)stats.stepJumps++}else{stats.maxContinuousEndpointDelta=Math.max(stats.maxContinuousEndpointDelta,delta);assert.ok(delta<0.001,`${f} ${j} ${delta}`)}}}}
 for(let j=0;j<v.direct.length;j++)for(const k of v.direct[j].keys){assert.deepEqual(sampleClip(v,k.time).direct[j].value,k.value);stats.directKeys++}
 const times=new Set([c.start,c.stop]);for(let t=c.start;t<c.stop;t+=1/c.sample_rate)times.add(t);for(const t of times){const x=sampleClip(v,t);assert.ok(x.channels.every(Number.isFinite));stats.sampledFrames++;stats.scalarSamples+=x.channels.length;}
 const all=eventsBetween(v,v.start,v.stop,{includeStart:true});assert.deepEqual(all.map(x=>x.index).sort((a,b)=>a-b),c.events.map((_,i)=>i));stats.events+=all.length;
 const mid=(v.start+v.stop)/2;assert.deepEqual([...eventsBetween(v,v.start,mid,{includeStart:true}),...eventsBetween(v,mid,v.stop)].map(x=>x.index),all.map(x=>x.index));
}
assert.equal(stats.clips,106);assert.equal(stats.channels,1964);assert.equal(stats.events,96);console.log(stats);writeFileSync(out,JSON.stringify(stats,null,2)+'\n');
