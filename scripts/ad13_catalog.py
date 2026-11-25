#!/usr/bin/env python3
"""Build private content-addressed catalog from validated AD packs; never publish."""
import argparse, collections as C, csv, hashlib, io, json, re, zipfile
from pathlib import Path
from PIL import Image

def sha(b):return hashlib.sha256(b).hexdigest()
def need(ok,msg):
    if not ok:raise ValueError(msg)
def build(base,out):
    out.mkdir(parents=True,exist_ok=False); blobs=out/'blobs';blobs.mkdir()
    src=base/'Chess_AD03_Private'
    def rows(n):return list(csv.DictReader((src/(n+'.csv')).open()))
    objects={(r['file'],r['path_id']):r for r in rows('unity_objects')};records={};aliases={};audio_ids={r['path_id']:r for r in objects.values() if r['class_id']=='83'};themes={'boards':{},'pieces':{},'highlights':{},'previews':{},'coordinates':{}};packs={};files={}
    def pack(n):
        p=base/n;packs[n]=sha(p.read_bytes());return zipfile.ZipFile(p)
    def image(b,w,h):
        with Image.open(io.BytesIO(b)) as im:need(im.format=='PNG' and im.size==(w,h),'image format/size');im.verify()
    def add(kind,source,pid,name,b,expected,ext,status,meta,origin):
        key=f'{kind}:{source}:{pid}';need(key not in records,'duplicate identity '+key)
        rec={'id':key,'kind':kind,'source':source,'pathId':pid,'name':name,'status':status,'metadata':meta,'origin':origin}
        if (source,pid) in objects:rec['objectSha256']=objects[source,pid]['object_sha256']
        if b is not None:
            h=sha(b);need(h==expected,'hash mismatch '+key);p=f'blobs/{h}.{ext}';prior=files.get(p)
            if prior is None:(out/p).write_bytes(b);files[p]=len(b)
            else:need(prior==len(b) and (out/p).read_bytes()==b,'hash collision')
            rec.update(blob=p,sha256=h,bytes=len(b))
        records[key]=rec;return key
    with pack('Chess_UIUX_Extracted_Assets.zip') as u,pack('Chess_Boards_and_Pieces.zip') as c,pack('Chess_AD05_OGG_Pack.zip') as au,pack('Chess_AD06_Normalized_Animations.zip') as an,pack('Chess_AD08_Spine_Mapping.zip') as sp:
        by_path=C.defaultdict(list)
        for r in rows('sprite_manifest'):
            p=r['export_path'];ok=r['png_integrity']=='True' and r['dimension_status']=='match';b=u.read(p) if ok else None;meta={k:r[k] for k in ['rect','pivot','border','pixels_per_unit','texture_source_id','texture_link_status','atlas_rect','trim_offset','settings_raw']};meta.update(width=int(r['export_width'] or 0),height=int(r['export_height'] or 0))
            if b is not None:image(b,meta['width'],meta['height'])
            k=add('sprite',r['file'],r['path_id'],r['name'],b,r['export_sha256'],'png','prepared' if ok else 'blocked',meta,p);by_path[p].append(k)
        for r in rows('texture_manifest'):
            p=r['png_path'];ok=r['png_status']=='match';b=u.read(p) if ok else None;w,h=int(r['width']),int(r['height']);
            if b is not None:image(b,w,h)
            add('texture',r['file'],r['path_id'],r['name'],b,r['png_sha256'],'png','review' if ok else 'blocked',{'width':w,'height':h,'unityFormat':r['unity_format']},p)
        for r in rows('chess_subset'):
            p=r['entry'];b=c.read(p);need(sha(b)==r['sha256'],'chess subset hash');cands=[k for path in json.loads(r['source_candidates']) for k in by_path[path] if records[k].get('sha256')==r['sha256']];need(len(cands)==1,'ambiguous chess sprite '+p);k=cands[0];aliases[p]=k
            m=re.fullmatch(r'(chess|chess2d)/(\d+)/chess_([wb])_([kqrbnp])\.png',p)
            if m:
                mode,tid,side,piece=m.groups();t=themes['pieces'].setdefault(tid,{'chess':{},'chess2d':{}});t[mode][side+piece]=k
            elif (m:=re.fullmatch(r'chess/(\d+)/yy\.png',p)):themes['pieces'].setdefault(m[1],{'chess':{},'chess2d':{}})['shadow']=k
            elif (m:=re.fullmatch(r'bg/board/(\d+)\.png',p)):themes['boards'][m[1]]=k
            elif p.startswith('square/'):themes['highlights'][Path(p).stem]=k
            elif p.startswith('bg/number/'):themes['coordinates'][Path(p).stem]=k
            else:themes['previews'][p]=k
        audio={r['file']:r for r in rows('audio_manifest')};av={r['source']:r for r in json.loads(au.read('pinned_decoder_verification.json'))['results']};bv={r['source']:r for r in json.loads(au.read('browser_verification.json'))['results']}
        for r in csv.DictReader(io.StringIO(au.read('conversion_manifest.csv').decode())):
            p=r['source'];need(r['status']==av[p]['status']==bv[p]['status']=='pass' and sha(u.read(p))==r['source_sha256']==audio[p]['sha256'],'audio verification');b=au.read(r['ogg_path']);need(len(b)==int(r['ogg_bytes']) and b[:4]==b'OggS','ogg');pid=Path(p).stem.split('__')[-1];original=audio_ids[pid];add('audio',original['file'],pid,original['name'],b,r['ogg_sha256'],'ogg','review',{'sourceSha256':r['source_sha256'],'rate':int(r['rate']),'channels':int(r['channels']),'samples':int(r['samples']),'trimRequired':True},p)
        for r in json.loads(an.read('normalized/index.json')):
            b=an.read('normalized/'+r['json']);raw=an.read('normalized/'+r['raw']);need(sha(raw)==r['source_sha256']==objects[r['source'],r['path_id']]['object_sha256'],'animation raw');v=json.loads(b);need(v['source_file']==r['source'] and v['path_id']==r['path_id'],'animation identity');add('animation',r['source'],r['path_id'],r['name'],b,r['normalized_sha256'],'json','review',{'events':r['events'],'bindings':r['bindings'],'start':r['start'],'stop':r['stop']},r['json'])
        spSource=json.loads(sp.read('summary.json'))['source'];payload=json.loads(sp.read('payloads.json'));spids={}
        for r in json.loads(sp.read('prepared_file_index.json')):
            b=sp.read(r['path']);need(sha(u.read(r['source']))==r['sha256'],'spine original export');pid=r['id']
            if r['category']=='textures':
                key=f'texture:{spSource}:{pid}';need(records[key]['sha256']==sha(b)==r['sha256'],'spine texture crosslink');spids[pid]=key;continue
            p=payload[pid];kind='spine_'+p['kind'];ext='skel' if p['kind']=='skeleton' else 'atlas';need(objects[spSource,pid]['object_sha256']==p['object_sha256'],'spine object identity');spids[pid]=add(kind,spSource,pid,p['name'],b,r['sha256'],ext,'review',{'version':'4.2.29' if ext=='skel' else None},r['source'])
        spine=[]
        for g in json.loads(sp.read('graph.json')):
            spine.append({'id':g['id'],'skeleton':spids[g['skeleton_id']],'status':'review','scale':g['scale'],'defaultMix':g['default_mix'],'atlases':[{'assetId':a['atlas_asset_id'],'atlas':spids[a['atlas_text_id']],'pages':[{'page':p['page'],'texture':spids[p['texture_id']],'declaredSize':p['declared_size'],'actualSize':p['texture_size'],'materialId':p['material_id'],'keywords':p['material_keywords']} for p in a['pages']]} for a in g['atlas_links']]})
        variants=[{'skeleton':spids[v['skeleton_id']],'atlas':spids[v['atlas_id']],'textures':[spids[t['id']] for t in v['texture_candidates']],'status':'review','serializedLinkVerified':False} for v in json.loads(sp.read('variant_candidates.json'))]
    expected={s+p for s in 'wb' for p in 'kqrbnp'};need(len(aliases)==365 and len(themes['boards'])==11 and len(themes['pieces'])==12,'theme count')
    for t in themes['pieces'].values():need(set(t['chess'])==set(t['chess2d'])==expected and 'shadow' in t,'piece coverage')
    need(len(spine)==47 and len(variants)==3 and len(records)==1512,'catalog coverage')
    with pack('Chess_Unity_Raw_Evidence.zip') as rz:
        cache={}
        for r in records.values():
            key=(r['source'],r['pathId']);obj=objects[key];source=key[0]
            if source not in cache:cache[source]=rz.read('unpacked/'+source)
            o,n=int(obj['offset']),int(obj['size_bytes']);raw=cache[source][o:o+n];need(len(raw)==n and sha(raw)==obj['object_sha256']==r['objectSha256'],'raw object mismatch '+r['id'])
    data={'schema':1,'scope':'private-preparation','records':records,'themes':themes,'aliases':aliases,'spine':spine,'variantCandidates':variants,'sourcePacks':packs};raw=(json.dumps(data,sort_keys=True,separators=(',',':'),ensure_ascii=False)+'\n').encode();(out/'catalog.json').write_bytes(raw)
    summary={'records':len(records),'rawObjectsVerified':len(records),'types':dict(C.Counter(r['kind'] for r in records.values())),'status':dict(C.Counter(r['status'] for r in records.values())),'uniqueBlobs':len(files),'blobBytes':sum(files.values()),'aliases':len(aliases),'catalogSha256':sha(raw),'boardThemes':len(themes['boards']),'pieceThemes':len(themes['pieces']),'spineSets':len(spine),'variantCandidates':len(variants)};(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(summary)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('base',type=Path);p.add_argument('out',type=Path);a=p.parse_args();build(a.base,a.out)
