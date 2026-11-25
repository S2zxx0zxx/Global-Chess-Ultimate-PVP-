#!/usr/bin/env python3
"""Validate complete native/WebGL render coverage and classify remaining source gaps."""
import argparse, json, hashlib, zipfile
from pathlib import Path
from collections import Counter

def main():
 p=argparse.ArgumentParser();p.add_argument('prior',type=Path);p.add_argument('current',type=Path);p.add_argument('ad11',type=Path);p.add_argument('raw_zip',type=Path);a=p.parse_args()
 def read(p):return json.loads(p.read_text())
 native=read(a.prior/'render_report.json');web=read(a.current/'webgl_full.json');
 def index(r):
  rows=r['rows'];out={(x['skeleton'],x['label']):x for x in rows};assert len(rows)==len(out)==300;return out
 n,w=index(native),index(web);assert n.keys()==w.keys() and web['render_passes']==600 and native['render_passes']==600
 visible=Counter();differences=[]
 for k,x in n.items():
  y=w[k];assert x['draws']==y['draws'] and len(x['variants'])==len(y['variants'])==2
  for i,j in zip(x['variants'],y['variants']):
   assert i['pma']==j['pma'];nv=bool(i['nonzero_alpha_pixels'] or i['nonzero_rgb_pixels']);wv=bool(j['nonzero_alpha_pixels'] or j['nonzero_rgb_pixels']);assert nv==wv==bool(x['draws']);visible['visible' if wv else 'empty']+=1
   differences.append(abs(i['nonzero_alpha_pixels']-j['nonzero_alpha_pixels']))
 assert visible=={'visible':540,'empty':60};assert web['texture_ids_uploaded']==52
 hdr=read(a.prior/'remaining_component_headers.json');assert len(hdr)==125;empty=[{'source':r['source'],'script':r['script_identity']['m_ClassName'],'status':'complete serialized common prefix, zero remaining body bytes; exact schema unavailable'} for r in hdr if r.get('body_offset')==r['raw_bytes']];assert len(empty)==8
 forms=read(a.ad11/'form_crosswalk.json');missing=[r['name'] for r in forms if not r['matches']];unmapped=[r['name'] for r in forms if r['target_candidate']=='no established equivalent'];assert set(missing)=={'UITestForm','UIHelpForm'} and len(unmapped)==6
 with zipfile.ZipFile(a.raw_zip) as z:
  b=z.read('assets/bin/Data/Managed/Metadata/global-metadata.dat');symbols={s:b.lower().count(s.lower().encode()) for s in ['UITestForm','UIHelpForm','dilan']}
 report={'render_comparison':{'pose_ids_match':300,'render_pairs_match_visibility':600,'visible':540,'empty':60,'webgl_page_texture_ids':52,'native_texture_ids':native['texture_ids_uploaded'],'alpha_pixel_count_difference_max':max(differences),'alpha_pixel_count_difference_mean':sum(differences)/len(differences),'scope':'same source pose and draw counts, visibility only; not pixel or Unity parity'},'schema_gap':{'full_metadata':12977,'total_components':13102,'exact_type_schema_missing':125,'empty_bodies_verified':empty,'nonempty_or_light_records':117},'missing_forms':missing,'unmapped_destinations':unmapped,'metadata_symbol_occurrences':symbols,'scope':'Symbols do not prove prefab or audio payload presence.'};(a.current/'closure_comparison.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
