import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { corpus } from './p01-corpus.mjs';
const port=4179,url='http://127.0.0.1:'+port;
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'inherit',env:{...process.env,VITE_AI_WORKER_FOUNDATION:'true'}});
let browser;
try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}
  assert.ok(ready);
  browser=await chromium.launch({headless:true});
  const results=[];
  for(const viewport of [{width:360,height:800},{width:414,height:896}]){
    const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await page.goto(url);
    const data=await page.evaluate(async ({corpus})=>{
      const {Chess}=await import('/node_modules/.vite/deps/chess__js.js').catch(()=>import('/node_modules/chess.js/dist/esm/chess.js'));
      const {startAdvisory,liveCandidate,searchId,configuredStrategy,buildRequest,startJob}=await import('/src/ai/client.ts');
      const {positionOf,uci}=await import('/src/ai/protocol.ts');
      const {evaluate}=await import('/src/ai/evaluation.ts');
      if(configuredStrategy()!=='foundation')throw Error('Internal opt-in not enabled');
      const identity=()=>({searchId:searchId(),gameId:'bench',revision:0});
      const prep=f=>{const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);return g;};
      const stats=a=>{const s=[...a].sort((x,y)=>x-y);return {count:a.length,p50Ms:s[Math.ceil(s.length*.5)-1],p95Ms:s[Math.ceil(s.length*.95)-1],maxMs:s[s.length-1]};};
      const warm=prep(corpus[0]);const warmId=identity(),warmJob=startAdvisory(warm,warmId,'play','foundation',1500);
      if((await warmJob.promise).status!=='complete')throw Error('Worker warmup failed');
      const longTasks=[],samples=[],engine=[],evalTimes=[],tactical={},statuses={};let maxNodes=0;
      const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({start:e.startTime,duration:e.duration});});
      observer.observe({type:'longtask',buffered:false});
      const begin=performance.now();
      for(let round=0;round<10;round++)for(const f of corpus){
        await new Promise(r=>setTimeout(r,0));
        const g=prep(f),before=JSON.stringify(positionOf(g)),id=identity(),at=performance.now(),job=startAdvisory(g,id,'play','foundation',1500),res=await job.promise;
        samples.push(performance.now()-at);engine.push(res.elapsedMs);
        statuses[res.status]=(statuses[res.status]||0)+1;maxNodes=Math.max(maxNodes,res.nodes||0);
        const move=liveCandidate(g,job.request,res,id);
        if(!move||JSON.stringify(positionOf(g))!==before||res.status!=='complete'||res.completedDepth!==1||res.pv[0]!==uci(move))throw Error('Worker result invalid '+f.id+' '+JSON.stringify(res));
        if(f.expected){const t=tactical[f.id]??={correct:0,total:0};t.total++;if(uci(move)===f.expected)t.correct++;}
        const et=performance.now();for(let j=0;j<20;j++)evaluate(g);evalTimes.push((performance.now()-et)/20);
      }
      const finish=performance.now();await new Promise(r=>setTimeout(r,100));observer.disconnect();
      const g=new Chess(),id=identity(),cancelled=startAdvisory(g,id,'play','foundation',1500);cancelled.cancel();
      if((await cancelled.promise).status!=='cancelled')throw Error('Cancellation failed');
      const current=identity(),stale=startAdvisory(g,current,'play','foundation',1500);g.move('e4');const staleResponse=await stale.promise;
      if(liveCandidate(g,stale.request,staleResponse,current))throw Error('Stale result accepted');
      const oldId=identity(),old=startAdvisory(g,oldId,'play','legacy',1500);
      if((await old.promise).status!=='complete')throw Error('Legacy worker failed');
      // A silent worker proves hard-stop even when no result arrives.
      const timeoutReq=buildRequest(g,identity(),'play','foundation',20),at=performance.now();
      let terminated=0;const silent={onmessage:null,onerror:null,onmessageerror:null,postMessage(){},terminate(){terminated++;}};
      const fallback=await startJob(timeoutReq,new Set(g.moves({verbose:true}).map(uci)),false,()=>silent).promise,hardStopMs=performance.now()-at;
      if(terminated!==1||fallback.reason!=='deadline'||fallback.completedDepth!==0||!fallback.move||hardStopMs>500)throw Error('Hard-stop fallback failed');
      return {roundTrip:stats(samples),workerElapsed:stats(engine),evaluation:stats(evalTimes),statuses,tactical,maxNodes,longTasks:longTasks.filter(t=>t.start>=begin&&t.start<=finish),hardStopMs,staleRejected:true,cancelled:true,legacyWorker:true};
    },{corpus});
    assert.equal(data.statuses.complete,60);assert.equal(data.tactical['mate-in-one'].correct,10);
    results.push({viewport,...data});
    // Exercise the actual React game entry using a saved computer match at Black's turn.
    await page.evaluate(()=>{localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true}));
      localStorage.setItem('gcu.lastMatch.v1',JSON.stringify({fen:'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',pgn:'1. e4 *',mode:'computer',active:true,seconds:[600,600],timed:false,remainingMs:[600000,600000]}));});
    await page.reload();await page.getByRole('button',{name:/RESUME SAVED MATCH/}).click();
    await page.waitForFunction(()=>{const raw=localStorage.getItem('gcu.lastMatch.v1');return raw&&JSON.parse(raw).fen.split(' ')[1]==='w';},null,{timeout:10000});
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')));
    assert.equal(saved.mode,'computer');assert.match(saved.pgn,/1\. e4 /);
    results[results.length-1].reactComputerResume=true;
    await page.close();
  }
  const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),platform:process.platform,kind:'P02 one-ply foundation; headless simulated mobile; not P03 strength or physical device certification',results};
  await mkdir('reports',{recursive:true});await writeFile('reports/p02-worker-baseline.json',JSON.stringify(report,null,2)+'\n');
  console.log('P02_WORKER_BASELINE '+JSON.stringify(report));
}finally{await browser?.close();vite.kill('SIGTERM');}
