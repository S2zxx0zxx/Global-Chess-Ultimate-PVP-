import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=[];
for(const dir of ['assets','pieces','art']){
 for(const e of await readdir('dist/'+dir,{withFileTypes:true})){
  if(e.isFile()&&(dir==='assets'?/\.(js|css)$/.test(e.name):/\.svg$/.test(e.name)))files.push('/'+dir+'/'+e.name);
 }
}
files.sort();
if(!files.some(p=>/\/engine\.worker-.*\.js$/.test(p)))throw Error('Engine worker missing from precache');
const hash=createHash('sha256');for(const path of ['/index.html',...files])hash.update(await readFile('dist'+path));
const version=hash.digest('hex').slice(0,16);
await writeFile('dist/offline-manifest.json',JSON.stringify({version,files})+'\n');
const sw=await readFile('dist/sw.js','utf8');await writeFile('dist/sw.js',sw.replace('__GCU_BUILD_VERSION__',version));
