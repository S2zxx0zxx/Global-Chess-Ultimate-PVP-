import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [dir,entry,out]=process.argv.slice(2),R=await import(pathToFileURL(resolve(entry)).href);
const get=n=>JSON.parse(readFileSync(join(dir,n+'.json'),'utf8'));
const files=new Map(get('prepared_file_index').map(r=>[r.category+':'+r.id,r]));const digest=b=>createHash('sha256').update(b).digest('hex');
function bytes(k,id){const f=files.get(k+':'+id),b=readFileSync(join(dir,f.path));assert.equal(digest(b),f.sha256);return b;}
const candidates=get('variant_candidates'),atlasData=get('atlases');assert.equal(candidates.length,3);const rows=[];
for(const c of candidates){assert.equal(c.texture_candidates.length,1);const a=atlasData[c.atlas_id];assert.equal(a.length,1);rows.push({atlas:c.atlas_id,skeleton:c.skeleton_id,texture:c.texture_candidates[0].id,texture_sha256:digest(bytes('textures',c.texture_candidates[0].id)),geometry_sha256:digest(JSON.stringify({size:a[0].size,fields:a[0].fields,regions:a[0].regions}))});}
assert.equal(new Set(rows.map(r=>r.texture_sha256)).size,1);assert.equal(new Set(rows.map(r=>r.geometry_sha256)).size,1);
const results=[];
for(const c of candidates){const raw=bytes('payloads',c.skeleton_id);const variants=[];for(const row of rows){const atlas=new R.TextureAtlas(bytes('payloads',row.atlas).toString('utf8'));for(const p of atlas.pages)p.setTexture(new R.FakeTexture({width:p.width,height:p.height}));const d=new R.SkeletonBinary(new R.AtlasAttachmentLoader(atlas)).readSkeletonData(Uint8Array.from(raw)),sd=new R.AnimationStateData(d);let frames=0,draws=0;const h=createHash('sha256');
function sample(s){frames++;for(const slot of s.drawOrder){if(!slot.bone.active)continue;const a=slot.getAttachment();if(!a)continue;let v,tri;if(a instanceof R.RegionAttachment){v=new Float32Array(8);a.computeWorldVertices(slot,v,0,2);tri=[0,1,2,2,3,0];}else if(a instanceof R.MeshAttachment){v=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,v.length,v,0,2);tri=Array.from(a.triangles);}else continue;draws++;const vals=[...v,...a.uvs,...tri,s.color.r,s.color.g,s.color.b,s.color.a,slot.color.r,slot.color.g,slot.color.b,slot.color.a,a.color.r,a.color.g,a.color.b,a.color.a,slot.data.blendMode];assert.ok(vals.every(Number.isFinite));h.update(JSON.stringify([slot.data.name,a.name,vals]));}}
for(const skin of d.skins){const s=new R.Skeleton(d);s.setSkin(skin);s.setToSetupPose();s.updateWorldTransform(R.Physics.reset);sample(s);}
for(const a of d.animations){const s=new R.Skeleton(d),st=new R.AnimationState(sd);s.setToSetupPose();s.updateWorldTransform(R.Physics.reset);st.setAnimation(0,a.name,false);const steps=Math.max(1,Math.ceil(a.duration*60));let last=0;for(let i=0;i<=steps;i++){const t=a.duration*i/steps;s.update(t-last);st.update(t-last);st.apply(s);s.updateWorldTransform(R.Physics.update);last=t;sample(s);}}
variants.push({atlas:row.atlas,frames,draws,sha256:h.digest('hex')});}
assert.equal(new Set(variants.map(v=>v.sha256)).size,1);assert.equal(new Set(variants.map(v=>v.frames)).size,1);assert.equal(new Set(variants.map(v=>v.draws)).size,1);results.push({skeleton:c.skeleton_id,variants});}
writeFileSync(out,JSON.stringify({status:'PASS',texture_identity:true,atlas_geometry_identity:true,rows,results,frames:results.reduce((n,r)=>n+r.variants.reduce((m,v)=>m+v.frames,0),0),scope:'Equivalent texture bytes, atlas region geometry and sampled runtime drawable geometry for nine candidate pairings; source serialized association remains absent; unit scale and zero mix test settings only.'},null,2)+'\n');console.log(results);
