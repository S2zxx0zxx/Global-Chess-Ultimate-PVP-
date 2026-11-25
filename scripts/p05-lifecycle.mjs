import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';

const url='http://127.0.0.1:4183',server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4183','--strictPort'],{stdio:'inherit'});
const root=new Chess(),initial=root.fen();root.move('e4');
const afterE4=root.fen(),pgn=root.pgn();root.move('e5');const afterE5=root.fen();
let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true});const results=[];
 for(const width of [360,414]){
  for(const name of ['pause-resume','undo','restart','navigation','resign','timeout-before-response','background-timeout','unavailable-worker','black-opening']){
   const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   const black=name==='black-opening',timed=name.includes('timeout');
   const seed={fen:black?initial:afterE4,pgn:black?new Chess().pgn():pgn,mode:'computer',active:true,seconds:[600,600],timed,remainingMs:[600000,timed?5000:600000],computer:{difficulty:'expert',playerSide:black?'b':'w',thinkingMs:1500}};
   // Fault injection only: a controllable worker port, not a claim of native-worker timing.
   // Existing p05-offline.mjs separately exercises the real production worker.
   await context.addInitScript(seed=>{
    localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true}));
    localStorage.setItem('gcu.lastMatch.v1',JSON.stringify(seed));
    const calls=[];
    const nativeWorker=window.Worker;
    window.Worker=class {
     constructor(url,options){if(!String(url).includes('engine.worker'))return new nativeWorker(url,options);}
     postMessage(req){calls.push({req,callback:this.onmessage,error:this.onerror,terminated:0,port:this});}
     terminate(){const c=calls.find(x=>x.port===this);if(c)c.terminated++;}
    };
    window.__p05={calls,deliver(i,move){const c=calls[i],q=c.req;c.callback?.({data:{protocol:1,type:'result',status:'complete',reason:'none',searchId:q.searchId,gameId:q.gameId,revision:q.revision,strategy:q.strategy,move,pv:[move],score:{kind:'cp',value:0,perspective:q.position.fen.split(' ')[1]},completedDepth:1,nodes:1,elapsedMs:5}});},
      fail(i){calls[i].error?.({preventDefault(){}});},
      expire(){const now=Date.now;Date.now=()=>now()+6000;}};
   },seed);
   const page=await context.newPage();await page.goto(url);
   const snap=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')));
   const history=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.history.v1')||'[]'));
   const waitCalls=n=>page.waitForFunction(n=>window.__p05.calls.length>=n,n,{timeout:4000});
   const calls=()=>page.evaluate(()=>window.__p05.calls.map(c=>({request:c.req,terminated:c.terminated})));
   const send=(i,m='e7e5')=>page.evaluate(([i,m])=>window.__p05.deliver(i,m),[i,m]);
   const assertFen=async f=>{assert.equal((await snap()).fen,f,name);};
   const waitFen=f=>page.waitForFunction(f=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen===f,f,{timeout:4000});
   const menu=()=>page.getByRole('button',{name:'Open match settings'}).click();
   const confirmEnded=async expected=>{await page.getByRole('alertdialog',{name:'Match result'}).waitFor();const rows=await history();assert.equal(rows.length,1,name);assert.equal(rows[0].result,expected,name);assert.equal((await snap()).active,false);await assertFen(afterE4);};
   await page.getByRole('button',{name:/RESUME SAVED MATCH/}).click();
   await waitCalls(1);assert.equal((await calls()).length,1,name);
   if(name==='pause-resume'){
    await menu();await send(0);await assertFen(afterE4);assert.equal((await calls())[0].terminated,1);
    await page.getByRole('button',{name:/Resume Game/}).click();await waitCalls(2);
    const c=await calls();assert.notEqual(c[0].request.searchId,c[1].request.searchId);assert.notEqual(c[0].request.revision,c[1].request.revision);
    await send(0);await send(1);await send(1);await waitFen(afterE5);
    await delay(150);assert.equal((await calls()).length,2);await assertFen(afterE5);assert.deepEqual(await history(),[]);
   }else if(name==='undo'){
    await page.getByRole('button',{name:/^↶ UNDO/}).click();await waitFen(initial);await send(0);await delay(150);await assertFen(initial);assert.equal((await calls())[0].terminated,1);assert.equal((await calls()).length,1);
   }else if(name==='restart'){
    await menu();await page.getByRole('button',{name:/Restart match/}).click();await waitFen(initial);await send(0);await delay(150);await assertFen(initial);assert.equal((await calls())[0].terminated,1);assert.equal((await calls()).length,1);
   }else if(name==='navigation'){
    await page.getByRole('button',{name:'Go home'}).click();await send(0);await assertFen(afterE4);
    await page.getByRole('button',{name:/RESUME SAVED MATCH/}).click();await waitCalls(2);
    const c=await calls();assert.notEqual(c[0].request.gameId,c[1].request.gameId);assert.equal(c[0].terminated,1);
    await send(0);await send(1);await waitFen(afterE5);assert.equal((await calls()).length,2);
   }else if(name==='resign'){
    await page.getByRole('button',{name:'Resign',exact:true}).click();await page.getByRole('button',{name:'RESIGN MATCH',exact:true}).click();await confirmEnded('black');await send(0);await confirmEnded('black');
   }else if(name==='timeout-before-response'||name==='background-timeout'){
    await page.evaluate(name=>{window.__p05.expire();if(name==='background-timeout')document.dispatchEvent(new Event('visibilitychange'));else window.__p05.deliver(0,'e7e5');},name);
    await confirmEnded('timeout-black');await send(0);await confirmEnded('timeout-black');
   }else if(name==='unavailable-worker'){
    await page.evaluate(()=>window.__p05.fail(0));await page.locator('[data-ai-status]').filter({hasText:'Legal fallback used'}).waitFor();
    const saved=await snap(),g=new Chess();g.loadPgn(saved.pgn);assert.equal(g.history().length,2);assert.equal(g.fen(),saved.fen);assert.equal(g.turn(),'w');assert.deepEqual(await history(),[]);
   }else if(black){
    assert.match(await page.getByRole('gridcell').first().getAttribute('aria-label'),/^h1:/);
    await send(0,'e2e4');await waitFen(afterE4);await send(0,'e2e4');await delay(150);await assertFen(afterE4);assert.equal((await calls()).length,1);assert.equal((await snap()).computer.playerSide,'b');
   }
   const finalCalls=await calls();assert.ok(finalCalls.every(c=>c.terminated===1),name+' exactly once worker termination');
   results.push({width,name,passed:true,requests:finalCalls.length,terminations:finalCalls.reduce((n,c)=>n+c.terminated,0),historyRecords:(await history()).length});await context.close();
  }
 }
 const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),kind:'Actual production UI with injected delayed/duplicate/error worker messages and clock fault; real worker offline tested separately',results};
 await mkdir('reports',{recursive:true});await writeFile('reports/p05-lifecycle.json',JSON.stringify(report,null,2)+'\n');console.log('P05_LIFECYCLE '+JSON.stringify(report));
}finally{await browser?.close();server.kill('SIGTERM');}
