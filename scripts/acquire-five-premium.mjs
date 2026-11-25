// One-time acquisition through the creator's normal, explicitly free public download flow.
// No credentials, payment, cookie extraction or entitlement bypass.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const source='https://georgez05.itch.io/chess-pack-high-and-low-poly';
const expectedArchive='38c2634fd987f512dee957ccfe41e08f68d753cdf2c35137851f49444e920ba6';
const entries=[
 ['Low Poly Chess Set.fbx','premium-low','83846babcf10e1b4aff60c551a917ee5dfd876f89124cef37a959076f84d7c9e'],
 ['Low Poly Stylised Chess Set.fbx','premium-low-fantasy','bc1cc69af39af7169d80407f1883d0bddc1931d47d751fdec428483984834c85'],
 ['High Poly Chess Set.fbx','premium-high','83602629e365f682f06657ab25873164bcd198d7e85adb8dfc8b9132673da819'],
 ['High Poly Stylised Chess Set.fbx','premium-high-fantasy','79a6376d551e6dfe1ba02044f75201910e42faede439a4effedddcb5e3912c33']
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const base='public/assets/five-resource';
try{if((await Promise.all(entries.map(async ([,id,sha])=>hash(await readFile(base+'/'+id+'.fbx'))===sha))).every(Boolean)){console.log('Exact assets already present');process.exit(0);}}catch{}
await mkdir('/tmp/gcu-five-assets',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();
 await page.goto(source+'/purchase',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByText('No thanks, just take me to the downloads',{exact:true}).click({timeout:20000});
 const filename=page.getByText('Chess Sets FBX.rar',{exact:true});await filename.waitFor({timeout:30000});
 const row=page.locator('.upload').filter({hasText:'Chess Sets FBX.rar'});
 if(await row.count()!==1)throw Error('Cannot uniquely identify official FBX archive row');
 const downloadPromise=page.waitForEvent('download',{timeout:60000});
 await row.getByText('Download',{exact:true}).click({timeout:20000});
 const download=await downloadPromise;
 if(download.suggestedFilename()!=='Chess Sets FBX.rar')throw Error('Unexpected filename');
 await download.saveAs('/tmp/gcu-five-assets/source.rar');
}finally{await browser.close();}
const archive=await readFile('/tmp/gcu-five-assets/source.rar');
if(hash(archive)!==expectedArchive)throw Error('Official archive differs from user-supplied SHA-256; refuse import');
execFileSync('7z',['x','-y','-o/tmp/gcu-five-assets/extracted','/tmp/gcu-five-assets/source.rar'],{stdio:'inherit'});
const {readdir}=await import('node:fs/promises');
const walk=async d=>{const out=[];for(const e of await readdir(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())out.push(...await walk(p));else if(e.isFile())out.push(p);}return out;};
const files=await walk('/tmp/gcu-five-assets/extracted');
const selected=[];
for(const [original,id,sha] of entries){
 const matches=files.filter(p=>p.split('/').at(-1)===original);if(matches.length!==1)throw Error('Missing or duplicate original '+original);
 const bytes=await readFile(matches[0]);if(hash(bytes)!==sha)throw Error('Original FBX hash mismatch '+original);
 selected.push({path:base+'/'+id+'.fbx',original,bytes:bytes.length,sha256:sha,source:matches[0]});
}
await mkdir(base,{recursive:true});
for(const item of selected)await copyFile(item.source,item.path);
await writeFile(base+'/NOTICE.txt','Georgez05 — 3D Chess Set Asset Pack. '+source+'\nAuthor permits use; credits appreciated. Original FBX bytes verified.\n');
await writeFile(base+'/manifest.json',JSON.stringify({creator:'Georgez05',source,archiveSHA256:expectedArchive,files:selected.map(({source:_,...m})=>m)},null,2)+'\n');
console.log('All four original user-supplied FBX hashes match official download.');
