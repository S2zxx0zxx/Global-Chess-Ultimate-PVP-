const BUILD_VERSION='__GCU_BUILD_VERSION__';
const PREFIX='global-chess-ultimate-';
const CACHE=PREFIX+'release-'+BUILD_VERSION;
const CORE=['/','/manifest.webmanifest','/icon.svg','/art/sheet-gold-knight.svg','/art/sheet-reward-chest.svg','/offline-manifest.json'];
const validPath=p=>typeof p==='string'&&/^\/(assets|pieces|art)\/[a-zA-Z0-9_.-]+$/.test(p);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch('/offline-manifest.json',{cache:'no-store'});
 if(!response.ok)throw Error('Precache manifest unavailable');
 const m=await response.json();
 if(m.version!==BUILD_VERSION||!/^[a-f0-9]{16}$/.test(m.version)||!Array.isArray(m.files)||!m.files.some(p=>/^\/assets\/engine\.worker-.*\.js$/.test(p))||m.files.some(p=>!validPath(p)))throw Error('Invalid precache manifest');
 const cache=await caches.open(CACHE);
 try{await cache.addAll([...new Set([...CORE,...m.files])].map(p=>new Request(new URL(p,self.location.origin),{cache:'reload'})));}
 catch(e){await caches.delete(CACHE);throw e;}
 // No skipWaiting: existing tabs keep their matching shell and chunks.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Normal activation waits until prior controlled clients have closed.
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const navigation=request.mode==='navigate'&&url.pathname==='/';
 const staticFile=CORE.includes(url.pathname)||validPath(url.pathname);
 if(!navigation&&!staticFile)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(navigation?'/':request,{ignoreSearch:navigation});
  if(cached)return cached;
  // No runtime cache writes or dynamic API shell substitution.
  try{return await fetch(request);}catch{return Response.error();}
 })());
});
