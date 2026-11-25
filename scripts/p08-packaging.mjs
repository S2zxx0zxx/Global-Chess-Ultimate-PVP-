import {readdir,readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const denied=new Set(['d79d87045aadd506c9ba5714a3699eadbb60004b1f2737190ba2344b28098f1c','83a6b9a2c6bc5b9a284c271a819b4cde143f938faed23736f63332c8681d320b','2629386fac2affd1e34f66f8f2d22d9fa6010f89721ea555903722e555b100bf','23a649cfebff58748a815e36866704c3c3b494b0f9d08bb0829dc01ca3fa6dd7','b68335b2d69cb974a6d8550d0c418ef21e4d08034ba2cee0734121232d0504dd','3afc2d8012ce21799a45b00a5ebf668af8389e07bfc783f3273489bc555445bf']);
const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await walk(p);else if(e.isFile()){assert.ok(!/\.(unitypackage|unity|prefab|anim|controller|mp3|wav|ogg)$/i.test(p),'Forbidden public asset '+p);const data=await readFile(p);assert.ok(!denied.has(createHash('sha256').update(data).digest('hex')),'Paid raw bytes '+p);files.push({path:p,bytes:data.length});}}}
await walk('dist');const manifest=JSON.parse(await readFile('dist/offline-manifest.json','utf8'));
for(const p of manifest.files)assert.ok((await stat('dist'+p)).isFile());
assert.ok(manifest.files.some(p=>p.includes('engine.worker-')));
console.log('P08_PACKAGING '+JSON.stringify({files:files.length,totalBytes:files.reduce((a,x)=>a+x.bytes,0),precacheBytes:files.filter(x=>manifest.files.includes(x.path.slice(4))).reduce((a,x)=>a+x.bytes,0),version:manifest.version,rawPaidAudio:0,mediaRequests:0}));
