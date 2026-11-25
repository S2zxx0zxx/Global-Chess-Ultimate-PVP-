import {chromium} from 'playwright';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const url='http://127.0.0.1:4185',server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4185','--strictPort'],{stdio:'inherit'});let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true});const results=[];
 for(const width of [360,414]){
  const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{window.__feedback={starts:0,buzz:0};const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){window.__feedback.starts++;return start.apply(this,a);};Object.defineProperty(navigator,'vibrate',{configurable:true,value:()=>{window.__feedback.buzz++;return true;}});});
  const page=await context.newPage(),external=[];page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:'))external.push(r.url());});
  await page.goto(url);await page.evaluate(()=>{localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true}));localStorage.setItem('gcu.feedback.v1',JSON.stringify({sound:true,volume:.5,resultVolume:.25,haptics:true}));});await page.reload();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);await page.reload();
  await page.getByRole('button',{name:'Settings',exact:true}).first().click();
  await page.getByText('Sound & Haptics',{exact:true}).click();await page.getByRole('button',{name:'TEST SOUND'}).click();await page.waitForFunction(()=>window.__feedback.starts>=1);
  const initial=await page.evaluate(()=>window.__feedback.starts);
  await page.getByLabel(/Sound effects/).uncheck();await page.getByRole('button',{name:'TEST SOUND'}).click();await delay(200);assert.equal(await page.evaluate(()=>window.__feedback.starts),initial);
  await page.getByLabel(/Sound effects/).check();await page.getByRole('button',{name:'TEST SOUND'}).click();await page.waitForFunction(n=>window.__feedback.starts>n,initial);
  await page.getByRole('button',{name:/⌂ Home/}).click();await page.getByRole('button',{name:/Pass & Play/i}).first().click();await page.getByRole('button',{name:/START MATCH/}).click();
  const snap=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')));
  await page.waitForFunction(()=>window.__feedback.starts>=initial+2);await delay(350);const base=await page.evaluate(()=>window.__feedback.starts);
  await page.getByRole('gridcell',{name:/^e2:/}).click();await delay(120);await page.getByRole('gridcell',{name:/^e4:/}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen.split(' ')[1]==='b');
  await page.waitForFunction(n=>window.__feedback.starts>=n+2,base);await delay(250);assert.equal(await page.evaluate(()=>window.__feedback.starts),base+2);
  await page.getByRole('button',{name:/^↶ UNDO/}).click();await delay(200);assert.equal(await page.evaluate(()=>window.__feedback.starts),base+2);
  assert.equal((await snap()).fen.split(' ')[1],'w');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.feedback.v1')));assert.equal(saved.sound,true);
  assert.deepEqual(external,[]);results.push({width,offline:true,actualWebAudioStarts:await page.evaluate(()=>window.__feedback.starts),mockHapticCalls:await page.evaluate(()=>window.__feedback.buzz),mute:true,onePickOneCommit:true,undoSilent:true,prefsPersisted:true,externalRequests:0});await context.close();
 }
 const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),results,note:'WebAudio scheduling observed; vibration mocked, no physical device or subjective listening certification'};await mkdir('reports',{recursive:true});await writeFile('reports/p08-feedback.json',JSON.stringify(report,null,2)+'\n');console.log('P08_FEEDBACK '+JSON.stringify(report));
}finally{await browser?.close();server.kill('SIGTERM');}
