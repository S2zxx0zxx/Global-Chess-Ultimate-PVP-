import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),originalManifest=JSON.parse(await readFile(root+'/offline-manifest.json','utf8')),originalSW=await readFile(root+'/sw.js','utf8'),originalIndex=await readFile(root+'/index.html','utf8');
let version=originalManifest.version,updated='fedcba9876543210';
if(updated===version)updated='0123456789abcdef';
let servedVersion=version;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,'http://localhost'),p=u.pathname;
 res.setHeader('Cache-Control','no-store');
 if(p==='/api/verification'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:servedVersion}));return;}
 if(p==='/offline-manifest.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({...originalManifest,version:servedVersion}));return;}
 if(p==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end(originalSW.replace(version,servedVersion));return;}
 if(p==='/'){res.setHeader('Content-Type','text/html');res.end(originalIndex.replace('</head>','<meta name="qa-release" content="'+servedVersion+'"></head>'));return;}
 const file=resolve(root,'.'+p);if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
 res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(4186,'127.0.0.1',r));const url='http://127.0.0.1:4186';
let browser;
try{
 browser=await chromium.launch({headless:true});
 const reports=[];
 for(const width of [360,414]){
  const ctx=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.evaluate(()=>localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true})));await page.reload();
  const about=async()=>{await page.reload();await page.locator('[data-rv-screen="home"]').waitFor();await page.getByRole('button',{name:'Settings',exact:true}).first().click();await page.locator('.rv-tile').filter({hasText:'Game build and independent identity'}).click();await page.locator('[data-rv-screen="about"]').waitFor();await page.locator('.rv-screen-index details').evaluateAll(es=>es.forEach(e=>e.open=true));};
  await about();const routes=await page.locator('.rv-screen-index button').allTextContents();assert.equal(routes.length,50);assert.equal(new Set(routes).size,50);
  const rows=[];await mkdir('reports/release-screens',{recursive:true});
  for(const route of routes){
   console.log('RELEASE_ROUTE '+width+' '+route);await about();await page.locator('.rv-screen-index button').filter({hasText:new RegExp('^'+route+'
   const id=route.replaceAll(' ','-');
   await page.locator('[data-rv-screen="'+id+'"]').waitFor();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   rows.push({id,overflow});
   if(['home','gameplay','settings','sound','about'].includes(id))await page.screenshot({path:'reports/release-screens/'+width+'-'+id+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(rows.filter(r=>r.overflow),[]);reports.push({width,routeCount:rows.length,rows});
  await ctx.close();
 }
 const ctx=await browser.newContext(),page=await ctx.newPage();
 await page.goto(url);await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await page.evaluate(()=>{localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true}));localStorage.setItem('gcu.guest.v1',JSON.stringify('Recovery QA'));});
 const actual=async p=>p.locator('meta[name=qa-release]').getAttribute('content');
 assert.equal(await actual(page),version);
 assert.equal(await page.evaluate(async()=> (await (await fetch('/api/verification')).json()).version),version);
 servedVersion=updated;
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
 assert.equal(await page.evaluate(async()=> (await (await fetch('/api/verification')).json()).version),updated);
 await ctx.setOffline(true);await page.reload();assert.equal(await actual(page),version);
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await ctx.setOffline(false);await page.close();
 // With no prior clients, waiting worker activates naturally, then a new document uses its shell.
 const second=await ctx.newPage();await second.goto(url);await second.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await second.waitForFunction(async ([v,old])=> (await caches.keys()).includes('global-chess-ultimate-release-'+v)&&!(await caches.keys()).includes('global-chess-ultimate-release-'+old),[updated,version]);
 await second.reload();assert.equal(await actual(second),updated);
 assert.equal(await second.evaluate(()=>JSON.parse(localStorage.getItem('gcu.guest.v1'))),'Recovery QA');
 await ctx.setOffline(true);await second.reload();assert.equal(await actual(second),updated);await ctx.setOffline(false);
 servedVersion=version;await second.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await second.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));await second.close();
 const third=await ctx.newPage();await third.goto(url);await third.evaluate(async()=>{await navigator.serviceWorker.ready;});await third.reload();assert.equal(await actual(third),version);
 assert.equal(await third.evaluate(()=>JSON.parse(localStorage.getItem('gcu.guest.v1'))),'Recovery QA');
 await ctx.setOffline(true);await third.reload();assert.equal(await actual(third),version);await ctx.close();
 const report={commit:process.env.GITHUB_SHA||'local',routes:reports,updateRollback:{old:version,new:updated,oldClientRetained:true,offlineBoth:true,rollback:true,guestPreserved:true,apiFresh:true},note:'Synthetic second release version, same compiled bundle; not hosted deployment or physical Android'};
 await writeFile('reports/release-readiness.json',JSON.stringify(report,null,2)+'\n');console.log('RELEASE_READINESS '+JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
)}).click();
   const id=route.replaceAll(' ','-');
   await page.locator('[data-rv-screen="'+id+'"]').waitFor();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   rows.push({id,overflow});
   if(['home','gameplay','settings','sound','about'].includes(id))await page.screenshot({path:'reports/release-screens/'+width+'-'+id+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(rows.filter(r=>r.overflow),[]);reports.push({width,routeCount:rows.length,rows});
  await ctx.close();
 }
 const ctx=await browser.newContext(),page=await ctx.newPage();
 await page.goto(url);await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await page.evaluate(()=>{localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true}));localStorage.setItem('gcu.guest.v1',JSON.stringify('Recovery QA'));});
 const actual=async p=>p.locator('meta[name=qa-release]').getAttribute('content');
 assert.equal(await actual(page),version);
 assert.equal(await page.evaluate(async()=> (await (await fetch('/api/verification')).json()).version),version);
 servedVersion=updated;
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
 assert.equal(await page.evaluate(async()=> (await (await fetch('/api/verification')).json()).version),updated);
 await ctx.setOffline(true);await page.reload();assert.equal(await actual(page),version);
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await ctx.setOffline(false);await page.close();
 // With no prior clients, waiting worker activates naturally, then a new document uses its shell.
 const second=await ctx.newPage();await second.goto(url);await second.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await second.waitForFunction(async ([v,old])=> (await caches.keys()).includes('global-chess-ultimate-release-'+v)&&!(await caches.keys()).includes('global-chess-ultimate-release-'+old),[updated,version]);
 await second.reload();assert.equal(await actual(second),updated);
 assert.equal(await second.evaluate(()=>JSON.parse(localStorage.getItem('gcu.guest.v1'))),'Recovery QA');
 await ctx.setOffline(true);await second.reload();assert.equal(await actual(second),updated);await ctx.setOffline(false);
 servedVersion=version;await second.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await second.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));await second.close();
 const third=await ctx.newPage();await third.goto(url);await third.evaluate(async()=>{await navigator.serviceWorker.ready;});await third.reload();assert.equal(await actual(third),version);
 assert.equal(await third.evaluate(()=>JSON.parse(localStorage.getItem('gcu.guest.v1'))),'Recovery QA');
 await ctx.setOffline(true);await third.reload();assert.equal(await actual(third),version);await ctx.close();
 const report={commit:process.env.GITHUB_SHA||'local',routes:reports,updateRollback:{old:version,new:updated,oldClientRetained:true,offlineBoth:true,rollback:true,guestPreserved:true,apiFresh:true},note:'Synthetic second release version, same compiled bundle; not hosted deployment or physical Android'};
 await writeFile('reports/release-readiness.json',JSON.stringify(report,null,2)+'\n');console.log('RELEASE_READINESS '+JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
