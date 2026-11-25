#!/usr/bin/env python3
"""Bounded missing resource search and in-memory original font test."""
import argparse,collections,hashlib,io,json,zipfile
from pathlib import Path
from fontTools.ttLib import TTFont
from PIL import ImageFont

def main():
 p=argparse.ArgumentParser();p.add_argument('apks',type=Path);p.add_argument('raw',type=Path);p.add_argument('r2',type=Path);p.add_argument('ad11',type=Path);p.add_argument('out',type=Path);a=p.parse_args();tokens=['uitestform','uihelpform','dilan'];splits=[]
 with zipfile.ZipFile(a.apks) as z:
  for name in z.namelist():
   with zipfile.ZipFile(io.BytesIO(z.read(name))) as s:
    hits=[];names=[]
    for i in s.infolist():
     if i.is_dir():continue
     with s.open(i) as f:b=f.read(8192)
     off=b.find(b'UnityFS\0')
     if off>=0:hits.append({'path':i.filename,'offset':off,'bytes':i.file_size})
     if any(t in i.filename.lower() for t in tokens):names.append(i.filename)
    splits.append({'split':name,'entries':len(s.infolist()),'unityfs_headers':hits,'name_hits':names})
 assert sum(len(s['unityfs_headers']) for s in splits)==10
 cfg=json.loads((a.ad11/'form_crosswalk.json').read_text());missing=[{'name':r['name'],'path':r['path'],'target_candidate':r['target_candidate']} for r in cfg if not r['matches']];assert {r['name'] for r in missing}=={'UITestForm','UIHelpForm'}
 old=json.loads(a.r2.read_text());target=next(r['target_object'] for r in old['edges'] if r['target_id']=='10102');fi=old['font']
 with zipfile.ZipFile(a.raw) as z:raw=z.read(old['archive_member']);o=target['offset'];b=raw[o:o+target['bytes']];assert hashlib.sha256(b).hexdigest()==target['sha256'];font=b[fi['offset_in_object']:fi['offset_in_object']+fi['sfnt_bytes']];assert hashlib.sha256(font).hexdigest()==fi['sfnt_sha256']
 with TTFont(io.BytesIO(font),checkChecksums=0) as f:
  cmap=f.getBestCmap();assert len(cmap)==332;all_glyphs=f.getGlyphOrder();assert all(x in all_glyphs for x in cmap.values())
 rows=[]
 for size in [12,24,48]:
  ff=ImageFont.truetype(io.BytesIO(font),size);n=0;empty=[]
  for cp in sorted(cmap):
   c=chr(cp);mask=ff.getmask(c);box=mask.getbbox();adv=ff.getlength(c);assert adv>=0;n+=1
   if box is None:empty.append(f'U+{cp:04X}')
  rows.append({'size':size,'glyph_calls':n,'empty_mask_codepoints':empty})
 report={'split_scan':splits,'total_entries':sum(s['entries'] for s in splits),'known_missing_forms':missing,'font':{'sha256':fi['sfnt_sha256'],'cmap_entries':len(cmap),'glyph_count':len(all_glyphs),'render_calls':sum(r['glyph_calls'] for r in rows),'sizes':rows,'original_checksum_mismatches':fi['checksum_mismatches']},'scope':'ZIP names and first 8192 bytes only; no claim of absence from unknown opaque members or server content. Font render smoke test, not source typography parity.'};a.out.write_text(json.dumps(report,indent=2)+'\n');print({k:v for k,v in report.items() if k!='split_scan'})
if __name__=='__main__':main()
