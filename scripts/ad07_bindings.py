#!/usr/bin/env python3
import argparse, collections as C, csv, hashlib, json, struct, zipfile, zlib
from pathlib import Path

def crc(s):return zlib.crc32(s.encode())
def main():
 p=argparse.ArgumentParser();p.add_argument('decoded',type=Path);p.add_argument('raw',type=Path);p.add_argument('objects',type=Path);p.add_argument('external',type=Path);p.add_argument('clips',type=Path);p.add_argument('out',type=Path);a=p.parse_args();a.out.mkdir(exist_ok=True)
 inv={(r['file'],r['path_id']):r for r in csv.DictReader(a.objects.open())};ext={(r['source_file'],int(r['file_id'])):r['target_file'] for r in csv.DictReader(a.external.open()) if r['status']=='mapped_file'}
 def ptr(f,p):return (f if p['m_FileID']==0 else ext.get((f,p['m_FileID'])),str(p['m_PathID']))
 def load(z,typ):return {(n[8:-len(typ)-6],pid):v for n in z.namelist() if n.startswith('decoded/') and n.endswith('/'+typ+'.json') for pid,v in json.loads(z.read(n)).items()}
 with zipfile.ZipFile(a.decoded) as z:
  go=load(z,'GameObject');tr={**load(z,'Transform'),**load(z,'RectTransform')};ctrl=load(z,'AnimatorController');scripts=load(z,'MonoScript');mono=load(z,'MonoBehaviour')
 # derive animator PPtrs from observed Unity 2022.3 56-byte type layout; verify raw hash and GO component membership
 roots=C.defaultdict(list);anim=[]
 with zipfile.ZipFile(a.raw) as z:
  cache={}
  for (f,pid),r in inv.items():
   if r['class_id']!='95':continue
   if f not in cache:cache[f]=z.read('unpacked/'+f)
   off,n=int(r['offset']),int(r['size_bytes']);b=cache[f][off:off+n]
   assert n==56 and hashlib.sha256(b).hexdigest()==r['object_sha256'];gf,gp=struct.unpack_from('<iq',b);cf,cp=struct.unpack_from('<iq',b,28);g=ptr(f,{'m_FileID':gf,'m_PathID':gp});c=ptr(f,{'m_FileID':cf,'m_PathID':cp});assert g in go and (f,pid) in [ptr(g[0],x['component']) for x in go[g]['m_Component']]
   t=[ptr(g[0],x['component']) for x in go[g]['m_Component'] if ptr(g[0],x['component']) in tr];assert len(t)==1
   rec={'animator':[f,pid],'root':list(t[0]),'controller':list(c),'controller_found':c in ctrl};anim.append(rec)
   if c in ctrl:roots[c].append((f,pid,t[0]))
 links=C.defaultdict(list);tos=0
 for c,v in ctrl.items():
  for t in v['m_TOS']:assert crc(t['second'])==t['first'];tos+=1
  for q in v['m_AnimationClips']:
   if c not in links[ptr(c[0],q)]:links[ptr(c[0],q)].append(c)
 def owner(t):return ptr(t[0],tr[t].get('#374',tr[t].get('m_GameObject')))
 def paths(t):
  result=C.defaultdict(list);stack=[(t,'',set())]
  while stack:
   k,s,seen=stack.pop()
   if k in seen or k not in tr:continue
   result[crc(s)].append((k,s));new=seen|{k}
   for q in tr[k]['m_Children']:
    ch=ptr(k[0],q)
    if ch in tr and owner(ch) in go:stack.append((ch,(s+'/' if s else '')+go[owner(ch)]['m_Name'],new))
  return result
 tree={t:paths(t) for rs in roots.values() for _,_,t in rs}
 def scalar_fields(v,p=''):
  if isinstance(v,dict):
   if 'm_FileID' in v or 'bytes' in v:return
   for k,x in v.items():
    if not k.startswith('#'):yield from scalar_fields(x,p+'.'+k if p else k)
  elif isinstance(v,(int,float,bool)):yield p
 scriptprops=C.defaultdict(set)
 for k,v in mono.items():
  sk=ptr(k[0],v['m_Script']);s=scripts.get(sk)
  if s:scriptprops[(s['m_AssemblyName'],s['m_Namespace'],s['m_ClassName'])].update(scalar_fields(v))
 def prop(f,b):
  t,at=b['typeID'],b['attribute'];names=[];sc=None
  if t==4:return {1:'m_LocalPosition',2:'m_LocalRotation',3:'m_LocalScale',4:'localEulerAnglesRaw'}.get(at),None
  if t==1:names=['m_IsActive']
  if t==225:names=['m_Alpha']
  if t==198:names=['InitialModule.startLifetime.minScalar','InitialModule.startSpeed.scalar','InitialModule.startSpeed.minScalar','InitialModule.startSize.scalar','InitialModule.startSize.minScalar','ShapeModule.angle','SizeModule.enabled','EmissionModule.m_Bursts.Array.data[0].countCurve.scalar']
  if t==224:names=[x+'.'+c for x in ['m_AnchoredPosition','m_SizeDelta','m_Pivot','m_AnchorMin','m_AnchorMax'] for c in 'xy']
  if t==114:
   s=scripts.get(ptr(f,b['script']))
   if s:sc=(s['m_AssemblyName'],s['m_Namespace'],s['m_ClassName']);names=scriptprops[sc]
  matches=sorted(x for x in names if crc(x)==at);return (matches[0] if len(matches)==1 else None),sc
 def component(t,b,sc):
  g=owner(t);cs=[ptr(g[0],v['component']) for v in go[g]['m_Component']];ty=b['typeID'];out=[]
  if ty==1:return [g]
  if ty==4:return [t] if inv[t]['class_id'] in ('4','224') else []
  for c in cs:
   if c not in inv or int(inv[c]['class_id'])!=ty:continue
   if ty==114:
    if c not in mono or sc is None:continue
    s=scripts.get(ptr(c[0],mono[c]['m_Script']));
    if not s or (s['m_AssemblyName'],s['m_Namespace'],s['m_ClassName'])!=sc:continue
   out.append(c)
  return out
 rows=[];summary=C.Counter();cliprows=[]
 for file in sorted(a.clips.glob('*.json')):
  v=json.loads(file.read_text());k=(v['source_file'],v['path_id']);cs=links[k];instances=[(c,x) for c in cs for x in roots[c]];at=0;cr=[]
  for i,b in enumerate(v['bindings']['genericBindings']):
   name,sc=prop(k[0],b);width={1:3,2:4,3:3,4:3}.get(b['attribute'],1) if b['typeID']==4 else 1
   matches=[];missing=[]
   for c,(af,ap,t) in instances:
    pp=tree[t].get(b['path'],[]);hits=[]
    for target,path in pp:
     for co in component(target,b,sc):hits.append({'root':list(t),'animator':[af,ap],'controller':list(c),'path':path,'target':list(target),'component':list(co)})
    if len(hits)==1 and len(pp)==1:matches.extend(hits)
    else:missing.append({'animator':[af,ap],'reason':'no_unique_path_component','candidate_count':len(hits)})
   status='resolved_all_instances' if name and instances and not missing else 'resolved_some_instances' if name and matches else 'property_only' if name else 'unresolved_property'
   row={'source':list(k),'clip':v['name'],'binding_index':i,'channel_start':at,'channel_count':width,'property':name,'script':sc,'binding':b,'status':status,'instance_count':len(instances),'matches':matches,'unresolved_instances':missing};at+=width;rows.append(row);cr.append(row);summary[status]+=1;summary['known_property']+=bool(name);summary['has_target']+=bool(matches);summary['instance_matches']+=len(matches);summary['instance_missing']+=len(missing)
  assert at==v['stream']['curve_count']+len(v['constant'])+v['dense']['m_CurveCount'];summary['scalar_channels']+=at
  cliprows.append({'source':list(k),'clip':v['name'],'controllers':[list(c) for c in cs],'instances':len(instances),'bindings':len(cr),'fully_resolved':sum(r['status']=='resolved_all_instances' for r in cr),'direct_curves':v['direct_curves']})
 summary.update({'clips':len(cliprows),'bindings':len(rows),'controllers':len(ctrl),'animators':len(anim),'animators_with_controller':sum(x['controller_found'] for x in anim),'tos_crc_matches':tos,'clips_with_instances':sum(x['instances']>0 for x in cliprows)})
 for name,data in [('bindings',rows),('clip_links',cliprows),('animators',anim),('summary',dict(summary))]:(a.out/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
 print(json.dumps(dict(summary),indent=2))
if __name__=='__main__':main()
