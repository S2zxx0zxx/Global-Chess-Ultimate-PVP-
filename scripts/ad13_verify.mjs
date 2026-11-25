import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createThemeLoader,sha256} from '../src/adoption/ad13-theme-loader.mjs';
const [dir,out]=process.argv.slice(2),catalogBytes=readFileSync(join(dir,'catalog.json')),summary=JSON.parse(readFileSync(join(dir,'summary.json'))),c=JSON.parse(catalogBytes);
const readBlob=async p=>readFileSync(join(dir,p));const loader=await createThemeLoader({catalogBytes,expectedSha256:summary.catalogSha256,readBlob});
const blobs=new Map();for(const r of Object.values(c.records)){if(r.status==='blocked')continue;const prior=blobs.get(r.blob);if(prior)assert.equal(prior.sha256,r.sha256);else {const b=await readBlob(r.blob);assert.equal(b.length,r.bytes);assert.equal(await sha256(b),r.sha256);blobs.set(r.blob,r);}}
assert.equal(blobs.size,summary.uniqueBlobs);assert.equal(readdirSync(join(dir,'blobs')).length,blobs.size);
const {boards,pieces}=loader.listThemes();let combinations=0,loaded=0;
for(const b of boards)for(const p of pieces)for(const mode of ['chess','chess2d']){const t=loader.resolveTheme(b,p,mode);assert.equal(Object.keys(t.pieces).length,12);combinations++;}
for(const p of pieces)for(const mode of ['chess','chess2d']){const t=await loader.loadTheme(boards[0],p,mode);assert.equal(Object.keys(t.pieces).length,12);loaded++;}
for(const b of boards){await loader.loadSprite(c.themes.boards[b]);}
for(const id of Object.values(c.aliases))await loader.loadSprite(id);
let negatives=0;async function rejects(f){await assert.rejects(f);negatives++;}
await rejects(()=>createThemeLoader({catalogBytes,expectedSha256:'0'.repeat(64),readBlob}));
await rejects(()=>loader.loadTheme('__proto__',pieces[0]));
await rejects(()=>loader.loadTheme(boards[0],pieces[0],'3d'));
await rejects(()=>loader.loadSprite(Object.values(c.records).find(r=>r.status==='review').id));
await rejects(()=>loader.loadSprite(Object.values(c.records).find(r=>r.status==='blocked').id));
const corrupt=await createThemeLoader({catalogBytes,expectedSha256:summary.catalogSha256,readBlob:async p=>{const b=await readBlob(p);b[0]^=1;return b;}});await rejects(()=>corrupt.loadTheme(boards[0],pieces[0]));
const missing=await createThemeLoader({catalogBytes,expectedSha256:summary.catalogSha256,readBlob:async()=>{throw Error('missing');}});await rejects(()=>missing.loadTheme(boards[0],pieces[0]));
const attack=structuredClone(c);Object.values(attack.records).find(r=>r.blob).blob='../x.png';const a=new TextEncoder().encode(JSON.stringify(attack));await rejects(async()=>createThemeLoader({catalogBytes:a,expectedSha256:await sha256(a),readBlob}));
for(const s of c.spine){assert.equal(c.records[s.skeleton].kind,'spine_skeleton');for(const a of s.atlases){assert.equal(c.records[a.atlas].kind,'spine_atlas');for(const p of a.pages)assert.equal(c.records[p.texture].kind,'texture');}}
const report={status:'PASS',records:Object.keys(c.records).length,verifiedBlobs:blobs.size,themeCombinations:combinations,fullThemeLoads:loaded,boardLoads:boards.length,aliasLoads:Object.keys(c.aliases).length,negativeTests:negatives,spineSets:c.spine.length,variantCandidates:c.variantCandidates.length,scope:'private bytes and loader; no production renderer integration'};writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(report);
