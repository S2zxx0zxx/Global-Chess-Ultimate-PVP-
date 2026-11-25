#!/usr/bin/env python3
"""Verify hierarchy against AD-03, join previously verified media dependency indexes."""
import argparse, ast, collections as C, csv, json
from pathlib import Path

def main():
 p=argparse.ArgumentParser();p.add_argument('results',type=Path);p.add_argument('ad03',type=Path);p.add_argument('ad07',type=Path);p.add_argument('ad08',type=Path);a=p.parse_args();d=a.results
 get=lambda n:json.loads((d/(n+'.json')).read_text()); nodes={tuple(n['source']):n for n in get('nodes')};comps={tuple(c['source']):c for c in get('components')};cfg=get('configuration');pref=next(k[0] for k in nodes if k[0].startswith('Prefab/'));layout=list(csv.DictReader((a.ad03/'layout_manifest.csv').open()))
 for r in layout:
  n=nodes[pref,r['gameobject_id']];t=n['layout'];assert n['transform']==r['rect_transform_id'];assert n['hierarchy_path']==r['hierarchy'];assert n['active']==(r['active']=='True')
  assert [t['m_SizeDelta']['x'],t['m_SizeDelta']['y'],t['m_AnchoredPosition']['x'],t['m_AnchoredPosition']['y']]==[float(r[k]) for k in ('width_delta','height_delta','anchored_x','anchored_y')]
  for k,f in [('anchor_min','m_AnchorMin'),('anchor_max','m_AnchorMax'),('pivot','m_Pivot'),('scale','m_LocalScale'),('rotation','m_LocalRotation')]:assert ast.literal_eval(r[k])==t[f]
 assert len(layout)==3038
 assert sum(len(n['components']) for n in nodes.values())==len(comps) and all(c['owner_verified'] for c in comps.values())
 for k,n in nodes.items():
  for c in n['components']:assert tuple(comps[tuple(c)]['owner'])==k
  if n['parent_go']:assert list((k[0],n['transform'])) in nodes[tuple(n['parent_go'])]['children']
 anim=json.loads((a.ad07/'animators.json').read_text());cl=json.loads((a.ad07/'clip_links.json').read_text());byctrl=C.defaultdict(list)
 for r in cl:
  for ctrl in r['controllers']:byctrl[tuple(ctrl)].append(r['source'])
 animlinks=[]
 for r in anim:
  c=comps[tuple(r['animator'])];animlinks.append({'component':r['animator'],'owner':c['owner'],'controller':r['controller'],'controller_found':r['controller_found'],'clips':byctrl[tuple(r['controller'])]})
 spine=json.loads((a.ad08/'prefab_skeleton_references.json').read_text());sl=[]
 for r in spine:
  c=comps[r['source_file'],r['source_id']];sl.append({'component':c['source'],'owner':c['owner'],'skeleton':[r['target_file'],r['target_id']]})
 banks=C.defaultdict(list)
 for r in csv.DictReader((a.ad03/'audio_manifest.csv').open()):banks[Path(r['file']).stem.rsplit('__',1)[0].casefold()].append(r['file'])
 sounds=[{'id':r[1],'name':r[3],'priority':r[4],'volume':r[5],'candidate_banks':banks[r[3].casefold()],'association':'case_insensitive_name_only'} for r in cfg['UISound']['rows']]
 report={'status':'PASS','layout_records_compared':len(layout),'component_owner_checks':len(comps),'animator_links':len(animlinks),'animator_controller_found':sum(r['controller_found'] for r in animlinks),'spine_links':len(sl),'sound_config_rows':len(sounds),'sound_name_matches':sum(bool(r['candidate_banks']) for r in sounds),'sound_unmatched':[r['name'] for r in sounds if not r['candidate_banks']],'sound_ambiguous':[r['name'] for r in sounds if len(r['candidate_banks'])>1],'scope':'source consistency and candidate mapping, not runtime visual or interaction equivalence'}
 for n,v in [('animation_dependencies',animlinks),('spine_dependencies',sl),('sound_candidates',sounds),('verification',report)]: (d/(n+'.json')).write_text(json.dumps(v,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
