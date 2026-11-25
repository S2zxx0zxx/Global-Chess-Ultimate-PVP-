#!/usr/bin/env python3
"""Independent structural verification of normalized clips against source exports."""
import argparse, collections, hashlib, json, math, struct, zipfile
from pathlib import Path

def check(ok,msg):
    if not ok: raise ValueError(msg)
def digest(b): return hashlib.sha256(b).hexdigest()
def restored(v):
    if isinstance(v,dict): return {k:int(x) if k=='m_PathID' else restored(x) for k,x in v.items()}
    if isinstance(v,list): return [restored(x) for x in v]
    return v

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('decoded_zip',type=Path);p.add_argument('raw_zip',type=Path);p.add_argument('directory',type=Path);a=p.parse_args();d=a.directory;index=json.loads((d/'index.json').read_text());check(len(index)==106,'clip count'); totals=collections.Counter(); keys=set()
    with zipfile.ZipFile(a.decoded_zip) as z,zipfile.ZipFile(a.raw_zip) as rawzip:
        sources={n:json.loads(z.read(n)) for n in z.namelist() if n.endswith('/AnimationClip.json')};raws={}
        for r in index:
            ident=(r['source'],r['path_id']);check(ident not in keys,'duplicate identity');keys.add(ident);p=d/r['json'];v=json.loads(p.read_bytes());raw=(d/r['raw']).read_bytes();check(digest(p.read_bytes())==r['normalized_sha256'] and digest(raw)==r['source_sha256'],'file hash');source='decoded/'+ident[0]+'/AnimationClip.json';a0=sources[source][ident[1]];check(restored(v['source_metadata'])==a0,'complete source metadata comparison');check(v['path_id']==ident[1] and v['source_file']==ident[0],'identity');
            if ident[0] not in raws:raws[ident[0]]=rawzip.read('unpacked/'+ident[0])
            check(raws[ident[0]].count(raw)==1,'original object byte sequence');m=a0['m_MuscleClip'];s=m['m_Clip']['data']['m_StreamedClip'];words=s['data'];stream=v['stream'];check(words==stream['words'],'word list');flat=[];tracks=collections.defaultdict(list)
            for i,f in enumerate(stream['frames']):
                flat.extend((f['time_word'],len(f['keys']))); t=struct.unpack('<f',struct.pack('<I',f['time_word']))[0]
                if f['kind']=='time':check(math.isfinite(t) and t==f['time'] and v['start']<=t<=v['stop'],'timed frame range')
                else:check(f['time_word'] in (0xff7fffff,0x7f800000),'sentinel identity')
                for j,k in enumerate(f['keys']):
                    flat.extend([k['index'],*k['coefficient_words']]);tracks[k['index']].append({'frame':i,'key':j});check(struct.pack('<4f',*k['coefficients'])==struct.pack('<4I',*k['coefficient_words']),'coefficient bits')
            check(flat==words,'reconstructed word sequence');check([tracks[i] for i in range(stream['curve_count'])]==stream['track_index'],'track index');check(v['dense']==m['m_Clip']['data']['m_DenseClip'] and v['constant']==m['m_Clip']['data']['m_ConstantClip']['data'],'dense/constants');check(restored(v['bindings'])==a0['m_ClipBindingConstant'] and restored(v['events'])==a0['m_Events'],'bindings/events');check(restored(v['direct_curves'])=={k:x for k,x in a0.items() if k.endswith('Curves') and isinstance(x,list)},'direct curves');check(all(v['start']<=e['time']<=v['stop'] for e in v['events']),'event timing');check((v['start'],v['stop'],v['sample_rate'],v['loop'],v['wrap_mode'])==(m['m_StartTime'],m['m_StopTime'],a0['m_SampleRate'],m['m_LoopTime'],a0['m_WrapMode']),'clip timing');totals.update({'clips':1,'words':len(flat),'keys':sum(len(f['keys']) for f in stream['frames']),'events':len(v['events']),'bindings':len(v['bindings']['genericBindings'])})
    check(len(keys)==sum(map(len,sources.values())),'source coverage');report={'status':'PASS','counts':dict(totals),'runtime_evaluation':False,'scope':'source-export and raw-object structural equality, not Unity runtime parity'};(d/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if __name__=='__main__':main()
