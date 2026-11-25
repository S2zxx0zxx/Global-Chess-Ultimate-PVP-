import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [dir,entry,out]=process.argv.slice(2),R=await import(pathToFileURL(resolve(entry)).href);
const get=n=>JSON.parse(readFileSync(join(dir,n+'.json'),'utf8'));
const files=new Map(get('prepared_file_index').map(r=>[r.category+':'+r.id,r]));
function payload(id){const f=files.get('payloads:'+id),b=readFileSync(join(dir,f.path));assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);return b;}
const data=get('atlases'),variants=get('variant_candidates'),rows=[];let input=null;const read=R.BinaryInput.prototype.readByte;R.BinaryInput.prototype.readByte=function(...a){input=this;return read.apply(this,a)};
for(const v of variants){const b=payload(v.skeleton_id);for(const aid of Object.keys(data)){let row={skeleton_id:v.skeleton_id,atlas_id:aid,expected_candidate:aid===v.atlas_id,status:'fail'};try{const atlas=new R.TextureAtlas(payload(aid).toString('utf8'));for(const p of atlas.pages)p.setTexture(new R.FakeTexture({width:p.width,height:p.height}));input=null;const sk=new R.SkeletonBinary(new R.AtlasAttachmentLoader(atlas)).readSkeletonData(Uint8Array.from(b));assert.equal(input.index,b.length);assert.equal(sk.version,'4.2.29');row.status='pass';row.animations=sk.animations.length;row.attachments=sk.skins.reduce((n,s)=>n+s.getAttachments().length,0);}catch(e){row.reason=String(e.message).slice(0,300)}rows.push(row)}}
assert.equal(rows.length,150);assert.equal(rows.filter(r=>r.expected_candidate&&r.status==='pass').length,3);const summary=variants.map(v=>({skeleton_id:v.skeleton_id,candidate_atlas:v.atlas_id,passing_atlases:rows.filter(r=>r.skeleton_id===v.skeleton_id&&r.status==='pass').map(r=>r.atlas_id)}));writeFileSync(out,JSON.stringify({scope:'Full binary parse compatibility against all 50 original atlas texts; not serialized association or rendering parity',summary,rows},null,2)+'\n');console.log(summary);
