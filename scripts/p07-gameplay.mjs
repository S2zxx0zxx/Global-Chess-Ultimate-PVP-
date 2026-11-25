import {chromium} from 'playwright';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {Chess} from 'chess.js';import * as THREE from 'three';
const url='http://127.0.0.1:4184',server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4184','--strictPort'],{stdio:'inherit'});let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});const results=[];
 for(const viewport of [{width:320,height:700},{width:360,height:800},{width:414,height:896},{width:768,height:1024},{width:896,height:414}]){
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:viewport.width<768,serviceWorkers:'block'});const page=await context.newPage();await mkdir('reports/p07-screenshots',{recursive:true});
  const trace=[];page.on('console',m=>{if(m.type()==='error')console.log('P07_BROWSER_ERROR '+m.text());});page.on('pageerror',e=>console.log('P07_PAGE_ERROR '+e.message));
  await page.addInitScript(()=>{window.__p07trace=[];for(const name of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','click','scroll'])document.addEventListener(name,e=>{const t=e.target;window.__p07trace.push({name,x:e.clientX,y:e.clientY,pointer:e.pointerId,target:t instanceof Element?t.closest('[data-square]')?.getAttribute('data-square')??t.className:null,board:document.querySelector('.gcu-drag-board')?.getBoundingClientRect().toJSON()});if(window.__p07trace.length>80)window.__p07trace.shift();},true);});
  async function setup(g=new Chess(),flip=false,reduced=false){
   await page.goto(url);await page.evaluate(({fen,pgn,flip,reduced})=>{localStorage.setItem('gcu.royal-ui.v1',JSON.stringify({completedIntro:true}));localStorage.setItem('gcu.lastMatch.v1',JSON.stringify({fen,pgn,mode:'local',active:true,seconds:[600,600],timed:false}));localStorage.setItem('gcu.settings.v1',JSON.stringify({flipped:flip,reducedMotion:reduced,hints:true}));},{fen:g.fen(),pgn:g.pgn(),flip,reduced});await page.reload();await page.getByRole('button',{name:/RESUME SAVED MATCH/}).click();
   await page.locator('.gcu-drag-board').scrollIntoViewIfNeeded();await page.locator('.gcu-drag-board').evaluate(e=>e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));await delay(100);
  }
  const cell=s=>page.locator('[data-square="'+s+'"]');
  const center=async s=>{const b=await cell(s).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
  const fen=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen);
  const waitFen=async g=>{try{await page.waitForFunction(f=>JSON.parse(localStorage.getItem('gcu.lastMatch.v1')).fen===f,g.fen(),{timeout:5000});}catch(e){console.log('P07_FAILURE '+JSON.stringify({viewport,expected:g.fen(),actual:await fen(),trace:await page.evaluate(()=>window.__p07trace)}));await page.screenshot({path:'reports/p07-screenshots/failure-'+viewport.width+'.png',fullPage:true});throw e;}};
  const drag=async(from,to)=>{const a=await center(from),b=typeof to==='string'?await center(to):to;const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('[data-square]')?.getAttribute('data-square'),a);assert.equal(hit,from,'source visible '+viewport.width);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();};
  let g=new Chess();await setup(g);const initial=g.fen();
  await drag('e2','e5');assert.equal(await fen(),initial);await delay(170);
  await drag('e7','e5');assert.equal(await fen(),initial);
  await drag('e2','e4');g.move('e4');await waitFen(g);assert.ok(await page.locator('.gcu-drag-board').getAttribute('data-event-id'));await delay(250);
  await cell('e7').focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');g.move('e5');await waitFen(g);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
  await setup(new Chess(),true,true);assert.equal(await page.locator('[data-square]').first().getAttribute('data-square'),'h1');await drag('e2','e4');g=new Chess();g.move('e4');await waitFen(g);
  assert.equal(await cell('e4').locator('img').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.screenshot({path:'reports/p07-screenshots/board-'+viewport.width+'.png',fullPage:true});
  results.push({viewport,drag:true,invalidDrop:true,enemyRejected:true,keyboard:true,flipped:true,reducedMotion:true,overflow:false});
  if(viewport.width===360){
   // Explicit pointer cancellation, off-board and resize, using actual mouse/touch events.
   await setup(new Chess());const a=await center('e2'),b=await center('e4');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.locator('[data-square="e2"]').dispatchEvent('pointercancel',{pointerId:1,bubbles:true});await page.mouse.up();assert.equal(await fen(),initial);
   await drag('e2',{x:1,y:1});assert.equal(await fen(),initial);
   await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});await page.setViewportSize({width:361,height:800});await page.mouse.up();assert.equal(await fen(),initial);await page.setViewportSize(viewport);
   await setup(new Chess());const cd=await context.newCDPSession(page),ta=await center('e2'),tb=await center('e4');await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[ta]});await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[tb]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});g=new Chess();g.move('e4');await waitFen(g);
   const special=[['castle','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1','g1','O-O'],['ep','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','e5','d6','exd6'],['promotion','1r5k/P7/8/8/8/8/8/7K w - - 0 1','a7','b8','axb8=N']];
   for(const [name,f,from,to,san] of special){g=new Chess(f);await setup(g);await drag(from,to);if(name==='promotion'){await page.getByRole('button',{name:'CANCEL PROMOTION'}).click();assert.equal(await fen(),g.fen());await drag(from,to);await page.getByRole('button',{name:'Promote to knight'}).click();}g.move(san);await waitFen(g);}
   // Actual WebGL renderer: project canonical square centers and click canvas.
   g=new Chess('4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1');await setup(g,false,true);await page.getByRole('button',{name:'3D BOARD'}).click();await page.getByText('3D board active · bundled Kytric low-poly pieces').waitFor({timeout:20000});
   assert.equal(await page.locator('.board3d-canvas').getAttribute('data-bundled-models'),'12');
   const canvas=page.locator('.board3d-canvas canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();const camera=new THREE.PerspectiveCamera(44,box.width/box.height,.1,80);camera.position.set(8.6,12,9);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const click3=async(s,y)=>{const v=new THREE.Vector3('abcdefgh'.indexOf(s[0])-3.5,y,8-Number(s[1])-3.5).project(camera);await page.mouse.click(box.x+(v.x+1)*box.width/2,box.y+(1-v.y)*box.height/2);};
   await click3('d3',.4);await click3('d5',.4);g.move('Rxd5');await waitFen(g);
   await page.getByRole('button',{name:'Open match settings'}).click();await page.getByRole('button',{name:/Flip board/}).click();await page.getByText('3D board active · bundled Kytric low-poly pieces').waitFor();await page.getByRole('button',{name:'2D BOARD'}).click();assert.equal(await page.locator('[data-square]').first().getAttribute('data-square'),'h1');await waitFen(g);
   await page.screenshot({path:'reports/p07-screenshots/special-360.png',fullPage:true});
   results.push({specialMoves:true,pointerCancel:true,offboard:true,resize:true,touch:true,webglCapture:true,cameraFlip:true});
  }
  await context.close();
 }
 const report={commit:process.env.GITHUB_SHA||'local',browser:browser.version(),results,kind:'Production Chromium simulated input and software WebGL; not physical Android'};await mkdir('reports',{recursive:true});await writeFile('reports/p07-gameplay.json',JSON.stringify(report,null,2)+'\n');console.log('P07_GAMEPLAY '+JSON.stringify(report));
}finally{await browser?.close();server.kill('SIGTERM');}
