import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const source=(await readFile('public/sw.js','utf8')).replace('__GCU_BUILD_VERSION__','1234567890abcdef');
function setup(){
 const handlers={},deleted=[],added=[],cache={match:async()=>undefined,addAll:async req=>added.push(...req.map(r=>new URL(r.url).pathname))};
 const self={location:{origin:'https://gcu.example'},addEventListener:(k,v)=>handlers[k]=v,clients:{claim:async()=>{}},skipWaiting:()=>{throw Error('forced activation');}};
 const caches={open:async()=>cache,keys:async()=>['foreign','global-chess-ultimate-old','global-chess-ultimate-release-1234567890abcdef'],delete:async k=>deleted.push(k)};
 const fetch=async()=>new Response(JSON.stringify({version:'1234567890abcdef',files:['/assets/engine.worker-x.js','/pieces/w-k.svg']}));
 vm.runInNewContext(source,{self,caches,fetch,URL,Request,Response,Set,Error});
 return {handlers,added,deleted};
}
test('release service worker installs scoped manifest and waits; cleans only own prior cache',async()=>{
 const {handlers,added,deleted}=setup();let p;handlers.install({waitUntil:v=>p=v});await p;assert.ok(added.includes('/assets/engine.worker-x.js'));assert.deepEqual(deleted,[]);handlers.activate({waitUntil:v=>p=v});await p;assert.deepEqual(deleted,['global-chess-ultimate-old']);
});
test('release service worker leaves dynamic GET, external and POST outside cache',()=>{
 const {handlers}=setup();for(const [url,method] of [['https://gcu.example/api/rooms','GET'],['https://gcu.example/account','GET'],['https://other.example/assets/a.js','GET'],['https://gcu.example/','POST']]){
  handlers.fetch({request:{url,method,mode:'navigate'},respondWith:()=>assert.fail('dynamic request intercepted')});
 }
});
