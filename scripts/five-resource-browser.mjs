import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
const url='http://127.0.0.1:4189';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4189','--strictPort'],{stdio:'inherit'});
let browser;
const boards=[['black-tan','#d7b991','#313335','#313335'],['black-white','#cfcbc8','#313335','#313335'],['brown-tan','#d7b991','#4e2e1f','#4e2e1f'],['brown-white','#cfcbc8','#4e2e1f','#4e2e1f'],['red-tan','#d7b991','#5c1616','#5c1616'],['red-white','#cfcbc8','#5c1616','#5c1616'],['tan-black','#d7b991','#313335','#d7b991'],['white-black','#cfcbc8','#313335','#cfcbc8']];
const rgb=h=>'rgb('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')';
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:360,height:800},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await mkdir('reports/five-resource-screenshots',{recursive:true});
 const results=[];
 async function setup(skin,theme,g=new Chess()){
  await page.goto(url);
  await page.evaluate(({skin,theme,fen,pgn})=>{
   localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true,skin}));
   localStorage.setItem('gcu.lastMatch.v1',JSON.stringify({fen,pgn,mode:'local',active:true,seconds:[600,600],timed:false}));
   localStorage.setItem('gcu.settings.v1',JSON.stringify({flipped:false,reducedMotion:true,hints:true,modelTheme:theme,useLibraryAssets:false}));
  },{skin,theme,fen:g.fen(),pgn:g.pgn()});
  await page.reload();await page.getByRole('button',{name:/RESUME SAVED MATCH/}).click();
  await page.locator('.gcu-drag-board').waitFor();
 }
 const cell=s=>page.locator('[data-square="'+s+'"]');
 const getFen=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen);
 for(const [id,light,dark,border] of boards){
  await setup('bg-'+id,'voxel');
  assert.equal(await page.locator('.app').getAttribute('data-board-skin'),'bg-'+id);
  assert.equal(await cell('a8').evaluate(e=>getComputedStyle(e).backgroundColor),rgb(light));
  assert.equal(await cell('a1').evaluate(e=>getComputedStyle(e).backgroundColor),rgb(dark));
  assert.equal(await page.locator('.royal-match-panel .board-surround').evaluate(e=>getComputedStyle(e).borderTopColor),rgb(border));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const g=new Chess();await cell('e2').click();await cell('e4').click();g.move('e4');
  await page.waitForFunction(f=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen===f,g.fen());
  await cell('c7').click();await cell('c5').click();g.move('c5');
  await page.locator('[data-opening="B20"]').waitFor();assert.equal(await getFen(),g.fen());
  await page.screenshot({path:'reports/five-resource-screenshots/'+id+'.png'});
  results.push({board:id,colors:true,legalMoves:true,opening:true});
 }
 for(const theme of ['voxel','voxel-wood']){
  await setup('bg-brown-tan',theme);await page.getByRole('button',{name:'3D BOARD'}).click();
  await page.getByText('3D board active · bundled Kytric low-poly pieces').waitFor({timeout:30000});
  assert.equal(await page.locator('.board3d-canvas').getAttribute('data-bundled-models'),'12');
  await page.screenshot({path:'reports/five-resource-screenshots/'+theme+'.png'});
  results.push({theme,models:12});
 }
 if(process.argv.includes('--premium')){
  for(const theme of ['premium-low','premium-low-fantasy','premium-high','premium-high-fantasy']){
   await setup('bg-brown-tan',theme);await page.getByRole('button',{name:'3D BOARD'}).click();
   await page.getByText('Original FBX · '+theme+' · 12 piece prototypes loaded').waitFor({timeout:120000});
   assert.equal(await page.locator('.board3d-canvas').getAttribute('data-premium-models'),'12');
   await page.screenshot({path:'reports/five-resource-screenshots/'+theme+'.png'});
   results.push({theme,models:12});
  }
 }
 assert.deepEqual(errors,[]);
 const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),results,scope:'software Chromium; not physical Android or hosted multiplayer'};
 await writeFile('reports/five-resource-browser.json',JSON.stringify(report,null,2)+'\n');console.log('FIVE_RESOURCE_BROWSER '+JSON.stringify(report));
 await context.close();
}finally{await browser?.close();server.kill('SIGTERM');}
