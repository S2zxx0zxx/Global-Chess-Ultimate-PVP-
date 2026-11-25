import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {tacticalCorpus} from './p03-tactical-corpus.mjs';
const url='http://127.0.0.1:4180';
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4180','--strictPort'],{stdio:'inherit',env:{...process.env,VITE_AI_ADVANCED_SEARCH:'true'}});
let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true});const results=[];
 for(const viewport of [{width:360,height:800},{width:414,height:896}]){
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await page.goto(url);
  const data=await page.evaluate(async corpus=>{
   const {Chess}=await import('/node_modules/.vite/deps/chess__js.js').catch(()=>import('/node_modules/chess.js/dist/esm/chess.js'));
   const {buildRequest,startJob,liveCandidate,searchId,configuredStrategy}=await import('/src/ai/client.ts');
   const {positionOf,uci,legalPV}=await import('/src/ai/protocol.ts');
   if(configuredStrategy()!=='advanced')throw Error('Advanced flag unavailable');
   const id=()=>({searchId:searchId(),gameId:'p03-bench',revision:0});
   const prep=f=>{const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);return g;};
   const metric=()=>({correct:0,total:0,latency:[],elapsed:[],depths:{},statuses:{},nodes:[],cases:{}});
   const stats={foundation:metric(),advanced:metric()},longTasks=[];
   const ob=new PerformanceObserver(l=>{for(const e of l.getEntries())longTasks.push({start:e.startTime,duration:e.duration});});
   ob.observe({type:'longtask',buffered:false});const begin=performance.now();
   for(let round=0;round<3;round++)for(const f of corpus)for(const strategy of ['foundation','advanced']){
     await new Promise(r=>setTimeout(r,0));
     const g=prep(f),before=JSON.stringify(positionOf(g)),identity=id(),request=buildRequest(g,identity,'play',strategy,1500,strategy==='advanced'?50000:256,7,strategy==='advanced'?3:1);
     const at=performance.now(),job=startJob(request,new Set(g.moves({verbose:true}).map(uci)),false),r=await job.promise;
     const wall=performance.now()-at,m=liveCandidate(g,request,r,identity),v=stats[strategy];
     if(!m||!legalPV(request,r.pv)||JSON.stringify(positionOf(g))!==before||r.status==='fallback'||r.completedDepth<1||r.nodes>request.limits.maxNodes)throw Error(f.id+' '+JSON.stringify(r));
     const ok=f.expected?f.expected.includes(r.move):!f.avoid.includes(r.move);
     v.correct+=Number(ok);v.total++;v.latency.push(wall);v.elapsed.push(r.elapsedMs);v.nodes.push(r.nodes);v.depths[r.completedDepth]=(v.depths[r.completedDepth]||0)+1;v.statuses[r.status]=(v.statuses[r.status]||0)+1;
     const t=v.cases[f.id]??={correct:0,total:0,moves:{}};t.correct+=Number(ok);t.total++;t.moves[r.move]=(t.moves[r.move]||0)+1;
   }
   const finish=performance.now();await new Promise(r=>setTimeout(r,100));ob.disconnect();
   const g=new Chess(),q=buildRequest(g,id(),'play','advanced',1,50000,7,6),at=performance.now();
   const short=await startJob(q,new Set(g.moves({verbose:true}).map(uci)),false).promise,shortWall=performance.now()-at;
   if(!short.move||shortWall>500||short.completedDepth!==0||short.score!==null)throw Error('Short deadline failed '+JSON.stringify(short));
   const long=buildRequest(g,id(),'play','advanced',2000,50000,7,6),lt=performance.now(),l=await startJob(long,new Set(g.moves({verbose:true}).map(uci)),false).promise,longWall=performance.now()-lt;
   if(!l.move||l.completedDepth<1||longWall>2500||l.nodes>50000||!legalPV(long,l.pv))throw Error('Long deadline failed '+JSON.stringify(l));
   const summary=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1)};};
   for(const v of Object.values(stats)){v.latency=summary(v.latency);v.elapsed=summary(v.elapsed);v.nodes=summary(v.nodes);}
   return {stats,longTasks:longTasks.filter(t=>t.start>=begin&&t.start<=finish),short:{status:short.status,wall:shortWall},long:{status:l.status,wall:longWall,depth:l.completedDepth,nodes:l.nodes}};
  },tacticalCorpus);
  assert.equal(data.stats.advanced.total,21);assert.ok(data.stats.advanced.correct>data.stats.foundation.correct,JSON.stringify(data.stats));results.push({viewport,...data});
  await page.evaluate(()=>{localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true}));localStorage.setItem('gcu.lastMatch.v1',JSON.stringify({fen:'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',pgn:'1. e4 *',mode:'computer',active:true,seconds:[600,600],timed:false,remainingMs:[600000,600000]}));});
  await page.reload();await page.getByRole('button',{name:/RESUME SAVED MATCH/}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen.split(' ')[1]==='w',null,{timeout:10000});
  results.at(-1).reactResume=true;await page.close();
 }
 const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),platform:process.platform,seed:7,budgetMs:1500,depth:3,results};
 await mkdir('reports',{recursive:true});await writeFile('reports/p03-advanced-search.json',JSON.stringify(report,null,2)+'\n');console.log('P03_ADVANCED_SEARCH '+JSON.stringify(report));
}finally{await browser?.close();vite.kill('SIGTERM');}
