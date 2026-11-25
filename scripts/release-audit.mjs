import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const raw=await readFile('scripts/p08-packaging.mjs','utf8');
const deny=new Set(JSON.parse(raw.match(/const denied=new Set\((\[[\s\S]*?\])\);/)[1]));
assert.equal(deny.size,78);
const tracked=execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
const findings=[];
const secretPatterns=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/],['aws-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],['stripe-live-secret',/\bsk_live_[A-Za-z0-9]{20,}\b/]];
for(const p of tracked){
 const bytes=await readFile(p);
 if(deny.has(createHash('sha256').update(bytes).digest('hex'))||/\.(unitypackage|unity|prefab|anim|controller|mp3|wav|ogg|apk|aab)$/i.test(p))findings.push({path:p,kind:'restricted-media'});
 if(p=== 'scripts/release-audit.mjs')continue;
 if(bytes.includes(0))continue;
 for(const [kind,re] of secretPatterns)if(re.test(bytes.toString('utf8')))findings.push({path:p,kind});
}
const packages=JSON.parse(await readFile('package-lock.json','utf8')).packages;
const notices=[],deps=[];
for(const [path,pkg] of Object.entries(packages)){
 if(!path.startsWith('node_modules/')||pkg.dev)continue;
 let actual;try{actual=JSON.parse(await readFile(path+'/package.json','utf8'));}catch(e){if(pkg.optional)continue;throw e;}
 const names=(await readdir(path)).filter(s=>/^(LICENSE|LICENCE|NOTICE|COPYING)(\.|$)/i.test(s)).sort();
 const texts=[];for(const f of names){try{texts.push([f,await readFile(path+'/'+f,'utf8')]);}catch{}}
 deps.push({name:actual.name,version:actual.version,license:actual.license??null,noticeFiles:texts.map(t=>t[0])});
 if(!texts.length||!actual.license)findings.push({path,kind:'missing-runtime-license'});
 notices.push(actual.name+' '+actual.version+' — '+(actual.license??'UNKNOWN')+'\n'+texts.map(([f,t])=>f+'\n'+t).join('\n\n'));
}
const report={sha:process.env.GITHUB_SHA||'local',trackedFiles:tracked.length,deniedHashes:deny.size,findings,dependencies:deps,note:'Bounded current-tree pattern and exact hash scan, not exhaustive credential or legal certification'};
await mkdir('reports',{recursive:true});await writeFile('reports/release-audit.json',JSON.stringify(report,null,2)+'\n');await writeFile('reports/THIRD_PARTY_NOTICES.txt',notices.join('\n\n----------------\n\n')+'\n');
console.log('RELEASE_AUDIT '+JSON.stringify(report));assert.deepEqual(findings,[]);
