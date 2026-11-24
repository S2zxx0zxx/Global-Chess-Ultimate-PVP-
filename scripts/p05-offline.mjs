import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url='http://127.0.0.1:4182',server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4182','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true});const results=[];
 for(const width of [360,414]){
 const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
 const page=await context.newPage(),external=[];
 page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(url);await page.evaluate(()=>localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true})));await page.reload();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 const workerCached=await page.evaluate(async()=>{for(const k of await caches.keys()){const c=await caches.open(k);if((await c.keys()).some(r=>/engine\.worker-.*\.js$/.test(r.url)))return true;}return false;});assert.ok(workerCached);
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:/VS\. Computer/i}).first().click();
 await page.locator('#rv-difficulty').selectOption('easy');await page.locator('#rv-side').selectOption('b');await page.locator('#rv-time').selectOption('10');
 await page.getByRole('button',{name:/START MATCH/}).click();
 const snap=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')));
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen.split(' ')[1]==='b');
 assert.equal((await snap()).computer.playerSide,'b');assert.equal((await snap()).timed,true);
 assert.match(await page.getByRole('gridcell').first().getAttribute('aria-label'),/^h1:/);
 await page.getByRole('button',{name:'Open match settings'}).click();const paused=await snap();await delay(500);
 await page.getByRole('button',{name:/Resume Game/}).click();
 assert.equal((await snap()).fen,paused.fen);
 await page.getByRole('gridcell',{name:/^e7:/}).click();await page.getByRole('gridcell',{name:/^e5:/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen.split(' ')[1]==='b');
 await page.getByRole('button',{name:/^↶ UNDO/}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen.split(' ')[1]==='b');assert.equal((await snap()).fen,paused.fen);
 await page.getByRole('button',{name:'Save game and return home'}).click();await page.reload();await page.getByRole('button',{name:/RESUME SAVED MATCH/}).click();assert.equal((await snap()).computer.playerSide,'b');
 await page.getByRole('button',{name:'Open match settings'}).click();await page.getByRole('button',{name:/Restart match/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen.split(' ')[1]==='b');
 await page.getByRole('button',{name:'Resign',exact:true}).click();
 const dialog=page.getByRole('alertdialog');await dialog.getByRole('button',{name:/Resign/i}).last().click();
 await page.getByRole('alertdialog',{name:'Match result'}).waitFor();
 assert.equal((await snap()).active,false);const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.history.v1')));assert.equal(history[0].result,'white');assert.equal(history[0].playerSide,'b');assert.equal(history.length,1);
 assert.deepEqual(external,[]);results.push({width,workerCached,offlineBlackFirstMove:true,undo:true,pause:true,resume:true,restart:true,resign:true,externalRequests:external.length});
 await context.close();
 }
 const report={commit:process.env.GITHUB_SHA||'local',results};await mkdir('reports',{recursive:true});await writeFile('reports/p05-offline.json',JSON.stringify(report,null,2)+'\n');console.log('P05_OFFLINE '+JSON.stringify(report));
}finally{await browser?.close();server.kill('SIGTERM');}
