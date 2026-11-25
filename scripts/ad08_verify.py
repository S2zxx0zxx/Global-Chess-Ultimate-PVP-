#!/usr/bin/env python3
"""Check AD-08 relationships against AD-03 independent serialized pointer inventory."""
import argparse, collections as C, csv, hashlib, json, struct, zipfile
from pathlib import Path

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);p.add_argument('edges',type=Path);p.add_argument('objects',type=Path);p.add_argument('raw',type=Path);p.add_argument('decoded',type=Path);a=p.parse_args();d=a.directory
 def get(n):return json.loads((d/(n+'.json')).read_text())
 summary=get('summary');source=summary['source'];graph=get('graph');pages=get('page_links');payloads=get('payloads');textures=get('textures');orphan=get('orphans');ids={g['id'] for g in graph};inv={(r['file'],r['path_id']):r for r in csv.DictReader(a.objects.open())};rows=list(csv.DictReader(a.edges.open()));lookup={(r['source_file'],r['source_id'],r['field'],r['target_file'],r['target_id']) for r in rows if r['status'] in ('local_resolved','external_resolved') and r['kind']=='serialized_pptr'}
 checked=set();cache={}
 with zipfile.ZipFile(a.raw) as z,zipfile.ZipFile(a.decoded) as decoded:
  def raw(f,pid):
   if f not in cache:cache[f]=z.read('unpacked/'+f)
   r=inv[f,pid];o,n=int(r['offset']),int(r['size_bytes']);b=cache[f][o:o+n];assert hashlib.sha256(b).hexdigest()==r['object_sha256'];return b
  def link(f,pid,field,tf,tid,fid=0):
   key=(f,pid,field,tf,tid);assert key in lookup,key;assert struct.pack('<iq',fid,int(tid)) in raw(f,pid),key;checked.add(key)
  for g in graph:
   link(source,g['id'],'/skeletonJSON',source,g['skeleton_id'])
   for i,l in enumerate(g['atlas_links']):
    aid=l['atlas_asset_id'];link(source,g['id'],f'/atlasAssets/{i}',source,aid);link(source,aid,'/atlasFile',source,l['atlas_text_id'])
    for j,q in enumerate(l['pages']):
     link(source,aid,f'/materials/{j}',source,q['material_id']);link(source,q['material_id'],'/m_SavedProperties/m_TexEnvs/0/second/m_Texture',source,q['texture_id']);link(source,q['material_id'],'/m_Shader',source,q['shader_id']);assert inv[source,q['shader_id']]['class_id']=='48'
  incoming=[r for r in rows if r['target_file']==source and r['target_id'] in ids and r['field'].endswith('/skeletonDataAsset') and r['kind']=='serialized_pptr']
  for r in incoming:link(r['source_file'],r['source_id'],r['field'],source,r['target_id'],int(r['file_id']))
  orphan_sprites=[r for r in rows if r['target_file']==source and r['target_id'] in orphan['textures'] and r['field']=='/m_RD/texture' and r['kind']=='serialized_pptr']
  for r in orphan_sprites:link(r['source_file'],r['source_id'],r['field'],source,r['target_id'],int(r['file_id']))
  for r in payloads.values():assert hashlib.sha256(decoded.read(r['source'])).hexdigest()==r['sha256']
  for r in textures.values():assert hashlib.sha256(decoded.read(r['source'])).hexdigest()==r['sha256']
 groups=C.defaultdict(list)
 for k,v in textures.items():groups[v['sha256']].append(k)
 duplicates=[{'sha256':k,'ids':v} for k,v in groups.items() if len(v)>1]
 report={'pointer_edges_verified':len(checked),'page_links':len(pages),'skeleton_component_references':len(incoming),'unique_skeleton_assets_referenced_by_components':len({r['target_id'] for r in incoming}),'orphan_material_texture_sprite_references':len(orphan_sprites),'texture_duplicate_groups':len(duplicates),'unique_texture_hashes':len(groups),'status':'PASS','scope':'AD-03 pointer field identity and raw PPtr byte presence; not runtime playback'}
 for n,v in [('verification',report),('prefab_skeleton_references',incoming),('non_material_texture_sprite_references',orphan_sprites),('texture_duplicate_groups',duplicates)]: (d/(n+'.json')).write_text(json.dumps(v,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
