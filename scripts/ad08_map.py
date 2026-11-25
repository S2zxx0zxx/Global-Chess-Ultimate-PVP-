#!/usr/bin/env python3
"""Read-only Spine dependency inventory; no runtime loading or UV modification."""
import argparse, collections as C, csv, hashlib, io, json, re, struct, zipfile
from pathlib import Path
from PIL import Image

def sha(b):return hashlib.sha256(b).hexdigest()
def need(ok,msg):
 if not ok:raise ValueError(msg)
def atlas(data):
 pages=[];page=region=None
 for line in data.decode('utf-8').splitlines():
  line=line.strip()
  if not line:continue
  if ':' not in line:
   if line.endswith('.png'):
    page={'name':line,'fields':{},'regions':[]};pages.append(page);region=None
   else:
    need(page is not None,'region without page');region={'name':line,'fields':{}};page['regions'].append(region)
  else:
   k,v=line.split(':',1);need(page is not None,'field without page');f=(region or page)['fields'];need(k not in f,'duplicate field');f[k]=v.strip()
 for p in pages:
  w,h=map(int,p['fields']['size'].split(','));need(w>0 and h>0,'page size');p['size']=[w,h]
  for r in p['regions']:
   x,y,a,b=map(int,r['fields']['bounds'].split(','));rot=int(r['fields'].get('rotate','0'));need(rot in (0,90),'rotation');pw,ph=(b,a) if rot==90 else (a,b);r['packed_bounds']=[x,y,pw,ph];r['in_declared_bounds']=x>=0 and y>=0 and pw>0 and ph>0 and x+pw<=w and y+ph<=h
 return pages

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('decoded',type=Path);ap.add_argument('raw',type=Path);ap.add_argument('objects',type=Path);ap.add_argument('textures',type=Path);ap.add_argument('out',type=Path);a=ap.parse_args();a.out.mkdir(exist_ok=False)
 with zipfile.ZipFile(a.decoded) as z,zipfile.ZipFile(a.raw) as rz:
  prefix=next(n.rsplit('/',1)[0] for n in z.namelist() if n.startswith('decoded/Spine/') and n.endswith('/TextAsset.json'));source=prefix.removeprefix('decoded/');raw=rz.read('unpacked/'+source);inv={r['path_id']:r for r in csv.DictReader(a.objects.open()) if r['file']==source};tex={r['path_id']:r for r in csv.DictReader(a.textures.open()) if r['file']==source};
  def load(t):return json.loads(z.read(prefix+'/'+t+'.json'))
  def obj(pid,cid):
   r=inv[pid];need(r['class_id']==str(cid),'class mismatch');o,n=int(r['offset']),int(r['size_bytes']);b=raw[o:o+n];need(len(b)==n and sha(b)==r['object_sha256'],'raw hash mismatch');return b
  def ref(p):need(p['m_FileID']==0,'unexpected external reference');return str(p['m_PathID'])
  text=load('TextAsset');mb=load('MonoBehaviour');mat=load('Material');ms=load('MonoScript');bundle=next(iter(load('AssetBundle').values()));paths=C.defaultdict(list)
  for x in bundle['m_Container']:paths[ref(x['second']['asset'])].append(x['first'])
  byid={n.rsplit('__',1)[1]:n for n in z.namelist() if n.startswith(prefix+'/text/')};payloads={};atlases={};skeletons={};groups=C.defaultdict(list);names=C.defaultdict(list)
  for pid,v in text.items():
   b=obj(pid,49);n=struct.unpack_from('<I',b)[0];name=b[4:4+n].decode();o=(4+n+3)&~3;size=struct.unpack_from('<I',b,o)[0];payload=b[o+4:o+4+size];need(name==v['m_Name'] and payload==z.read(byid[pid]),'TextAsset export mismatch');need(o+4+size<=len(b) and not any(b[o+4+size:]),'TextAsset padding');kind='atlas' if '.atlas' in name else 'skeleton';r={'id':pid,'name':name,'kind':kind,'source':byid[pid],'bytes':size,'sha256':sha(payload),'object_sha256':inv[pid]['object_sha256'],'container_paths':paths[pid]};groups[(kind,sha(payload))].append(pid);names[(kind,name)].append(pid);payloads[pid]=r
   if kind=='atlas':atlases[pid]=atlas(payload)
   else:
    length=payload[8]-1;version=payload[9:9+length].decode('ascii');need(version=='4.2.29','version');skeletons[pid]={'version':version,'header_hash_hex':payload[:8].hex(),'header_bounds':list(struct.unpack_from('>5f',payload,9+length)),'binary_parse':'header_only'}
  textures={}
  for pid,t in tex.items():
   obj(pid,28);data=z.read(t['png_path']);need(sha(data)==t['png_sha256'],'texture hash');im=Image.open(io.BytesIO(data));im.verify();need(im.size==(int(t['width']),int(t['height'])),'texture dimension');textures[pid]={'name':t['name'],'size':list(im.size),'mode':im.mode,'sha256':sha(data),'source':t['png_path'],'container_paths':paths[pid],'unity_format':t['unity_format']}
  def script(v):return ms[ref(v['m_Script'])]['m_ClassName']
  graph=[];usedS=set();usedA=set();usedT=set();usedM=set();usedAA=set();edges=[]
  for sid,s in mb.items():
   if script(s)!='SkeletonDataAsset':continue
   obj(sid,114);sk=ref(s['skeletonJSON']);need(sk in skeletons,'missing skeleton');usedS.add(sk);links=[]
   for ar in s['atlasAssets']:
    aid=ref(ar);at=mb[aid];need(script(at)=='SpineAtlasAsset','atlas class');obj(aid,114);usedAA.add(aid);tid=ref(at['atlasFile']);usedA.add(tid);pages=atlases[tid];need(len(pages)==len(at['materials']),'page/material count');pl=[]
    for p,mr in zip(pages,at['materials']):
     mid=ref(mr);m=mat[mid];obj(mid,21);usedM.add(mid);env=[x['second'] for x in m['m_SavedProperties']['m_TexEnvs'] if x['first']=='_MainTex'];need(len(env)==1,'MainTex count');tx=ref(env[0]['m_Texture']);t=textures[tx];usedT.add(tx);need(Path(p['name']).stem==t['name'],'page/texture name mismatch');row={'skeleton_asset_id':sid,'atlas_asset_id':aid,'atlas_text_id':tid,'page':p['name'],'material_id':mid,'material_name':m['m_Name'],'texture_id':tx,'declared_size':p['size'],'texture_size':t['size'],'dimensions_match':p['size']==t['size'],'texture_sha256':t['sha256'],'shader_id':ref(m['m_Shader']),'material_keywords':m['m_ValidKeywords'],'maintex_scale':env[0]['m_Scale'],'maintex_offset':env[0]['m_Offset']};pl.append(row);edges.append(row)
    links.append({'atlas_asset_id':aid,'atlas_text_id':tid,'pages':pl})
   graph.append({'id':sid,'name':s['m_Name'],'skeleton_id':sk,'scale':s['scale'],'default_mix':s['defaultMix'],'atlas_links':links})
  orphan={'skeletons':sorted(set(skeletons)-usedS),'atlases':sorted(set(atlases)-usedA),'textures':sorted(set(textures)-usedT),'materials':sorted(set(mat)-usedM),'atlas_assets':sorted({k for k,v in mb.items() if script(v)=='SpineAtlasAsset'}-usedAA)}
  # Container-path pairs are candidates, not serialized skeleton data links.
  candidates=[]
  for sid in orphan['skeletons']:
   for sp in paths[sid]:
    for tid in orphan['atlases']:
     for tp in paths[tid]:
      if sp.replace('.skel 1.bytes','.atlas 1.txt')==tp:
       candidates.append({'skeleton_id':sid,'atlas_id':tid,'reason':'matching original variant container path','texture_candidates':[{ 'id':i,'name':textures[i]['name'],'paths':paths[i]} for i in orphan['textures'] if any(x==sp.replace('.skel 1.bytes',' 1.png') for x in paths[i])],'verified_serialized_link':False})
  allpages=[p for ps in atlases.values() for p in ps];regions=[r for p in allpages for r in p['regions']];dups=[{'kind':k,'sha256':h,'ids':v} for (k,h),v in groups.items() if len(v)>1];dupnames=[{'kind':k,'name':n,'ids':v} for (k,n),v in names.items() if len(v)>1];summary={'source':source,'text_payloads':len(payloads),'skeletons':len(skeletons),'atlases':len(atlases),'atlas_pages':len(allpages),'regions':len(regions),'rotated_regions':sum(r['fields'].get('rotate')=='90' for r in regions),'out_of_bounds_regions':sum(not r['in_declared_bounds'] for r in regions),'textures':len(textures),'skeleton_assets':len(graph),'atlas_assets':len(usedAA),'page_material_links':len(edges),'dimension_matches':sum(x['dimensions_match'] for x in edges),'dimension_mismatches':sum(not x['dimensions_match'] for x in edges),'fully_matching_skeleton_assets':sum(all(p['dimensions_match'] for l in g['atlas_links'] for p in l['pages']) for g in graph),'duplicate_payload_groups':len(dups),'duplicate_name_groups':len(dupnames),'orphans':{k:len(v) for k,v in orphan.items()},'variant_candidates':len(candidates),'runtime_verified':False}
  for name,data in [('summary',summary),('payloads',payloads),('skeleton_headers',skeletons),('atlases',atlases),('textures',textures),('graph',graph),('page_links',edges),('orphans',orphan),('variant_candidates',candidates),('duplicate_payloads',dups),('duplicate_names',dupnames)]: (a.out/(name+'.json')).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
  print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
