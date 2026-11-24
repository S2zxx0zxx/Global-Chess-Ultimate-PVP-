const BUILD_VERSION='__GCU_BUILD_VERSION__';
const PREFIX='global-chess-ultimate-';
const CORE=['/','/manifest.webmanifest','/icon.svg','/art/sheet-gold-knight.svg','/art/sheet-reward-chest.svg','/offline-manifest.json'];
const META='global-chess-ultimate-p05-meta';
let cacheName;
async function activeCache(){
 if(cacheName)return cacheName;
 const meta=await caches.open(META),response=await meta.match('/__gcu_active_cache');
 if(!response)throw Error('Offline cache not installed');
 cacheName=await response.text();return cacheName;
}
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const response=await fetch('/offline-manifest.json',{cache:'no-store'});
 if(!response.ok)throw Error('Precache manifest unavailable');
 const m=await response.json();
 if(m.version!==BUILD_VERSION||!/^[a-f0-9]{16}$/.test(m.version)||!Array.isArray(m.files)||!m.files.some(p=>/^\/assets\/engine\.worker-.*\.js$/.test(p))||m.files.some(p=>typeof p!=='string'||!/^\/(assets|pieces|art)\/[a-zA-Z0-9_.-]+$/.test(p)))throw Error('Invalid precache manifest');
 const name=PREFIX+'p05-'+m.version,cache=await caches.open(name);
 await cache.addAll([...new Set([...CORE,...m.files])]);
 cacheName=name;
 await self.skipWaiting();
 })());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const name=await activeCache(),meta=await caches.open(META);
 await meta.put('/__gcu_active_cache',new Response(name));
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==name&&key!==META)await caches.delete(key);
 await self.clients.claim();
 })());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const optional3D=/^\/assets\/(?:models|chessset|humanoid|previews)\//.test(url.pathname)||url.pathname==='/assets/asset-manifest.json';
 if(optional3D)return;
 event.respondWith((async()=>{
  const cache=await caches.open(await activeCache());
  // Immutable bundled assets use the installed version; navigation also uses its matching shell.
  const cached=await cache.match(event.request);
  if(cached)return cached;
  if(event.request.mode==='navigate'){const shell=await cache.match('/');if(shell)return shell;}
  try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
  catch{return Response.error();}
 })());
});
