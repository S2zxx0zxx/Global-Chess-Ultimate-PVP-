import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {tacticalCorpus} from './p03-tactical-corpus.mjs';
const url='http://127.0.0.1:4181',vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4181','--strictPort'],{stdio:'inherit',env:{...process.env,VITE_AI_OPTIMIZED_SEARCH:'true'}});
let browser;try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true});const results=[];
 for(const viewport of [{width:360,height:800},{width:414,height:896}]){
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await page.goto(url);
  const data=await page.evaluate(async corpus=>{
   const {Chess}=await import('/node_modules/.vite/deps/chess__js.js').catch(()=>import('/node_modules/chess.js/dist/esm/chess.js'));
   const {buildRequest,startJob,configuredStrategy,searchId}=await import('/src/ai/client.ts');
   const {uci,legalPV,positionOf}=await import('/src/ai/protocol.ts');
   if(configuredStrategy()!=='optimized')throw Error('Flag');
   const observations=[],longTasks=[];const ob=new PerformanceObserver(l=>{for(const e of l.getEntries())longTasks.push(e.duration);});ob.observe({type:'longtask'});
   for(const f of corpus)for(const strategy of ['advanced','optimized']){
    const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);
    const before=JSON.stringify(positionOf(g)),q=buildRequest(g,{searchId:searchId(),gameId:'p04',revision:0},'play',strategy,1500,50000,7,3);
    const at=performance.now(),x=await startJob(q,new Set(g.moves({verbose:true}).map(uci)),false).promise,wall=performance.now()-at;
    if(!x.move||x.completedDepth<1||!legalPV(q,x.pv)||JSON.stringify(positionOf(g))!==before)throw Error(JSON.stringify(x));
    const correct=f.expected?f.expected.includes(x.move):!f.avoid.includes(x.move);
    if(!correct)throw Error(f.id+' '+strategy+' '+JSON.stringify(x));
    observations.push({id:f.id,strategy,wall,elapsed:x.elapsedMs,nodes:x.nodes,depth:x.completedDepth,status:x.status,diagnostics:x.diagnostics});
   }
   await new Promise(r=>setTimeout(r,100));ob.disconnect();return {observations,longTasks};
  },tacticalCorpus);
  results.push({viewport,...data});await page.close();
 }
 const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),platform:process.platform,results};await mkdir('reports',{recursive:true});await writeFile('reports/p04-browser.json',JSON.stringify(report,null,2)+'\n');console.log('P04_BROWSER '+JSON.stringify(report));
}finally{await browser?.close();vite.kill('SIGTERM');}
