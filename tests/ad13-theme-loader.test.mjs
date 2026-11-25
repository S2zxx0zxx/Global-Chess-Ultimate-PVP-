import test from 'node:test';
import assert from 'node:assert/strict';
import {createThemeLoader,sha256} from '../src/adoption/ad13-theme-loader.mjs';
const keys=['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
async function fixture(edit=()=>{},provider){
  // Synthetic bytes test integrity/selection only, not PNG decoding.
  const bytes=Uint8Array.of(137,80,78,71,13,10,26,10),h=await sha256(bytes),id='sprite:fixture:1';
  const c={schema:1,scope:'private-preparation',records:{[id]:{id,kind:'sprite',source:'fixture',pathId:'1',status:'prepared',blob:'blobs/'+h+'.png',sha256:h,bytes:bytes.length,metadata:{width:1,height:1}}},aliases:{board:id},themes:{boards:{'0':id},pieces:{'0':{chess:Object.fromEntries(keys.map(k=>[k,id])),chess2d:Object.fromEntries(keys.map(k=>[k,id])),shadow:id}},highlights:{},previews:{},coordinates:{}}};
  edit(c,id);const catalogBytes=new TextEncoder().encode(JSON.stringify(c));return {catalogBytes,expectedSha256:await sha256(catalogBytes),readBlob:provider??(async()=>bytes)};
}
test('AD13 complete theme and immutable resolution',async()=>{const l=await createThemeLoader(await fixture());const t=await l.loadTheme('0','0');assert.equal(Object.keys(t.pieces).length,12);assert.equal(t.board.width,1);const a=l.resolveTheme('0','0');a.pieces.wk='changed';assert.notEqual(l.resolveTheme('0','0').pieces.wk,'changed');});
test('AD13 integrity and missing resource fail closed',async()=>{const f=await fixture();await assert.rejects(()=>createThemeLoader({...f,expectedSha256:'0'.repeat(64)}),/integrity/);for(const readBlob of [async()=>Uint8Array.of(1),async()=>new Uint8Array(8),async()=>{throw Error('missing')}]){const l=await createThemeLoader({...f,readBlob});await assert.rejects(()=>l.loadTheme('0','0'));}});
test('AD13 invalid references, paths and review state rejected',async()=>{for(const edit of [(c,id)=>{delete c.themes.pieces['0'].chess.wk},(c,id)=>{c.records[id].blob='../bad.png'},(c,id)=>{c.records[id].status='review'},(c,id)=>{c.aliases.board='unknown'}])await assert.rejects(async()=>createThemeLoader(await fixture(edit)));});
test('AD13 invalid theme IDs and renderer mode rejected',async()=>{const l=await createThemeLoader(await fixture());for(const [b,p,m] of [['__proto__','0','chess'],['0','toString','chess'],['0','0','3d']])assert.throws(()=>l.resolveTheme(b,p,m));});
