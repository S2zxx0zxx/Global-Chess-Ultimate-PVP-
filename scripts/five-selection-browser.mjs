import {chromium} from 'playwright';
import {build} from 'esbuild';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initialMatch,publicMatchState} from '../server/src/rules.mjs';
// Real production worker handler, with a narrow in-memory Durable Object platform shim.
// No hosted deployment, third-party signaling, external account, or fake success claims.
const compiled=await build({entryPoints:['server/src/index.js'],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'local-durable-object-test',setup(b){
 b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'worker-shim',namespace:'local-worker'}));
 b.onLoad({filter:/.*/,namespace:'local-worker'},()=>({contents:'export class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env;} }',loader:'js'}));
}}]});
const {MatchRoom}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const roomId='ABCDEF123456',tokens={w:'a'.repeat(64),b:'b'.repeat(64)};
let match={...initialMatch(tokens.w,Date.now()+600000),status:'active',guestToken:tokens.b};
const peers=new Map();let writes=0;
const storage={get:async k=>k==='match'?structuredClone(match):undefined,put:async(k,v)=>{assert.equal(k,'match');match=structuredClone(v);writes++;},transaction:async callback=>callback(storage)};
const room=new MatchRoom({storage,getWebSockets:()=>[...peers.values()]},{});
const url='http://127.0.0.1:4190';
// Use a real production build with endpoint baked in, then a strict local preview.
// Vite dev readiness was returning a non-2xx response in CI.
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir','dist-selection'],{env:{...process.env,VITE_CHESS_ROOM_API:url},stdio:'inherit'});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','dist-selection','--host','127.0.0.1','--port','4190','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(200);}assert.ok(ready);
 browser=await chromium.launch({headless:true});
 const errors=[];
 async function client(side){
  const context=await browser.newContext({viewport:{width:360,height:800},serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({roomId,token,side})=>{sessionStorage.setItem('gcu.private-room.v1',JSON.stringify({roomId,token,side}));},{roomId,token:tokens[side],side});
  await page.routeWebSocket('ws://127.0.0.1:4190/api/rooms/'+roomId+'/socket',route=>{
   let attachment={side,nonce:'test-'+side};
   const socket={deserializeAttachment:()=>structuredClone(attachment),serializeAttachment:v=>{attachment=structuredClone(v);},send:data=>route.send(data),close:()=>{}};
   peers.set(side,socket);
   route.onMessage(data=>{void room.webSocketMessage(socket,data).catch(e=>errors.push(e.message));});
   route.onClose(()=>{if(peers.get(side)===socket)peers.delete(side);void room.webSocketClose(socket,1000,'test close',true).catch(e=>errors.push(e.message));});
   socket.send(JSON.stringify(publicMatchState(match,side)));
  });
  await page.goto(url+'/?room='+roomId);
  await page.getByRole('grid',{name:'Online chessboard'}).waitFor();
  return {context,page};
 }
 const white=await client('w'),black=await client('b'),w=white.page,b=black.page;
 const selected=(page,square)=>page.locator('.gcu-opponent-selected[aria-label^="'+square+' "]');
 const cell=(page,square)=>page.getByRole('gridcell',{name:new RegExp('^'+square+' ')});
 await cell(w,'e2').click();await selected(b,'e2').waitFor();
 assert.equal(await selected(w,'e2').count(),0);assert.equal(writes,0);assert.equal(match.revision,0);
 await cell(w,'e2').click();await selected(b,'e2').waitFor({state:'detached'});
 await room.webSocketMessage(peers.get('w'),JSON.stringify({type:'selection',square:'e7',revision:0}));
 await delay(100);assert.equal(await b.locator('.gcu-opponent-selected').count(),0);
 await cell(w,'e2').click();await selected(b,'e2').waitFor();await cell(w,'e4').click();
 await selected(b,'e2').waitFor({state:'detached'});
 await b.getByText('Your move',{exact:false}).first().waitFor();assert.equal(match.revision,1);assert.equal(writes,1);
 peers.get('b').send(JSON.stringify({type:'selection',side:'w',revision:0,square:'d2'}));await delay(100);assert.equal(await b.locator('.gcu-opponent-selected').count(),0);
 await cell(b,'e7').click();await selected(w,'e7').waitFor();
 await cell(b,'c7').click();await selected(w,'c7').waitFor();assert.equal(await selected(w,'e7').count(),0);
 await cell(b,'c5').click();await selected(w,'c7').waitFor({state:'detached'});
 await w.getByText('B20 · Sicilian Defense',{exact:true}).waitFor();await b.getByText('B20 · Sicilian Defense',{exact:true}).waitFor();
 assert.equal(match.revision,2);assert.equal(writes,2);
 // Disconnect of currently selecting player clears remote highlight without a chess move.
 await cell(w,'g1').click();await selected(b,'g1').waitFor();await white.context.close();await selected(b,'g1').waitFor({state:'detached'});
 assert.equal(match.revision,2);assert.equal(writes,2);assert.deepEqual(errors,[]);
 await mkdir('reports',{recursive:true});await writeFile('reports/five-selection-browser.json',JSON.stringify({commit:process.env.GITHUB_SHA||'local',twoBrowserContexts:true,actualWorkerHandler:true,transport:'Playwright WebSocket interception + in-memory Durable Object shim',selection:true,deselection:true,wrongOwnershipRejected:true,staleRevisionRejected:true,moveClears:true,disconnectClears:true,openingBothClients:true,selectionStorageWrites:0,hosted:false},null,2)+'\n');
 console.log('FIVE_SELECTION_BROWSER PASS');
 await black.context.close();
}finally{await browser?.close();server.kill('SIGTERM');}
