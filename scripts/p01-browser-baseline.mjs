import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { corpus } from './p01-corpus.mjs';

const port=4178, url='http://127.0.0.1:'+port;
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'inherit'});
let browser;
try {
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}
  assert.ok(ready,'Vite server not ready');
  browser=await chromium.launch({headless:true});
  const results=[];
  for(const viewport of [{width:360,height:800},{width:414,height:896}]){
    const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await page.goto(url);
    const data=await page.evaluate(async ({corpus})=>{
      const {Chess}=await import('/node_modules/.vite/deps/chess__js.js').catch(async()=>await import('/node_modules/chess.js/dist/esm/chess.js'));
      const {chooseComputerMove}=await import('/src/game.ts');
      const {replayTimeline,replayPosition}=await import('/src/chess-state.ts');
      const samples=[],replaySamples=[],longTasks=[],tactical={};
      const supported=PerformanceObserver.supportedEntryTypes.includes('longtask');
      const observer=supported?new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({start:e.startTime,duration:e.duration});}):null;
      observer?.observe({type:'longtask',buffered:false});
      const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
      const quantile=(a,q)=>[...a].sort((x,y)=>x-y)[Math.ceil(a.length*q)-1];
      const summary=a=>({samples:a.length,p50Ms:quantile(a,.5),p95Ms:quantile(a,.95),maxMs:Math.max(...a)});
      const prepare=f=>{const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);return g;};
      const replayGame=new Chess();for(const move of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'])replayGame.move(move);
      const pgn=replayGame.pgn();
      const begin=performance.now();
      for(let round=0;round<30;round++){
        for(const f of corpus){
          await yieldTask();
          const g=prepare(f),before=g.fen(),history=JSON.stringify(g.history());
          const at=performance.now(),move=chooseComputerMove(g),elapsed=performance.now()-at;
          if(!move||!g.moves({verbose:true}).some(m=>m.lan===move.lan)||g.fen()!==before||JSON.stringify(g.history())!==history)throw Error('Illegal or mutating heuristic '+f.id);
          samples.push(elapsed);
          if(f.expected){const t=tactical[f.id]??={correct:0,total:0,expected:f.expected,actual:move.lan};t.total++;if(move.lan===f.expected)t.correct++;}
        }
        await yieldTask();
        const at=performance.now(),timeline=replayTimeline(pgn),position=replayPosition(timeline,timeline.moves.length);
        replaySamples.push(performance.now()-at);
        if(!position.isThreefoldRepetition()||position.fen()!==replayGame.fen())throw Error('Replay history mismatch');
      }
      const finish=performance.now();await new Promise(r=>setTimeout(r,100));observer?.disconnect();
      return {heuristic:summary(samples),replay:summary(replaySamples),tactical,longTaskSupported:supported,longTasks:longTasks.filter(t=>t.start>=begin&&t.start<=finish),userAgent:navigator.userAgent};
    },{corpus});
    assert.equal(data.heuristic.samples,180);assert.equal(data.replay.samples,30);
    assert.ok(data.longTaskSupported,'Chromium long-task observer unavailable');
    results.push({viewport,...data});
    await page.close();
  }
  const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),platform:process.platform,kind:'Headless Chromium mobile viewport baseline; not physical device or production runtime certification',results};
  await mkdir('reports',{recursive:true});
  await writeFile('reports/p01-browser-baseline.json',JSON.stringify(report,null,2)+'\n');
  console.log('P01_BROWSER_BASELINE '+JSON.stringify(report));
}finally{
  await browser?.close();vite.kill('SIGTERM');
}
