#!/usr/bin/env python3
"""Normalize recovered Unity clips without resolving bindings or evaluating curves."""
import argparse, csv, hashlib, json, math, struct, zipfile
from pathlib import Path
from collections import Counter

def require(ok, msg):
    if not ok: raise ValueError(msg)
def sha(b): return hashlib.sha256(b).hexdigest()
def f32(w):
    v=struct.unpack('<f',struct.pack('<I',w))[0]
    return v if math.isfinite(v) else ('+Infinity' if v>0 else '-Infinity' if v<0 else 'NaN')
def jsonbytes(v): return (json.dumps(v,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
def number(v): return int.from_bytes(bytes.fromhex(v['hex']),'little') if isinstance(v,dict) else v

def normalize(a,raw,source,pid):
    m=a['m_MuscleClip']; d=m['m_Clip']['data']; s=d['m_StreamedClip']; words=s['data']; n=number(s['curveCount']); dense=d['m_DenseClip']; constants=d['m_ConstantClip']['data']; frames=[]; tracks=[[] for _ in range(n)]; pos=0
    packed=struct.pack('<%dI'%len(words),*words)
    if words: require(raw.count(packed)==1,'stream words not uniquely located in raw object')
    while pos<len(words):
        require(pos+2<=len(words),'truncated frame'); w,k=words[pos:pos+2];pos+=2; t=f32(w); require(k<=(len(words)-pos)//5,'truncated keys'); keys=[];seen=set()
        for _ in range(k):
            idx,*co=words[pos:pos+5];pos+=5;require(0<=idx<n and idx not in seen,'bad/duplicate curve index');seen.add(idx)
            key={'index':idx,'coefficient_words':co,'coefficients':[f32(v) for v in co]}; keys.append(key);tracks[idx].append({'frame':len(frames),'key':len(keys)-1})
        kind='boundary_min' if w==0xff7fffff else 'boundary_infinity' if w==0x7f800000 else 'time'
        frames.append({'time_word':w,'time':t,'kind':kind,'keys':keys})
    restored=[v for f in frames for v in [f['time_word'],len(f['keys'])]+[j for k in f['keys'] for j in [k['index'],*k['coefficient_words']]]]
    require(restored==words,'word roundtrip'); ts=[f['time'] for f in frames if f['kind']=='time'];require(all(isinstance(t,(int,float)) and math.isfinite(t) for t in ts) and ts==sorted(ts),'time order')
    require(len(dense['m_SampleArray'])==dense['m_CurveCount']*dense['m_FrameCount'],'dense count')
    require(m['m_StartTime']<=m['m_StopTime'] and a['m_SampleRate']>0,'clip timing')
    def pointers(v):
        if isinstance(v,dict): return {k:str(x) if k=='m_PathID' else pointers(x) for k,x in v.items()}
        if isinstance(v,list): return [pointers(x) for x in v]
        return v
    direct={k:pointers(v) for k,v in a.items() if k.endswith('Curves') and isinstance(v,list)}
    return {'schema_version':1,'source_file':source,'path_id':pid,'source_sha256':sha(raw),'source_bytes':len(raw),'name':a['m_Name'],'start':m['m_StartTime'],'stop':m['m_StopTime'],'sample_rate':a['m_SampleRate'],'wrap_mode':a['m_WrapMode'],'loop':m['m_LoopTime'],'stream':{'curve_count':n,'words':words,'frames':frames,'track_index':tracks},'dense':dense,'constant':constants,'direct_curves':direct,'bindings':pointers(a['m_ClipBindingConstant']),'events':pointers(a['m_Events']),'source_metadata':pointers(a),'binding_status':'unresolved_ad07','runtime_evaluation':'not_attempted'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('decoded_zip',type=Path);p.add_argument('raw_zip',type=Path);p.add_argument('objects_csv',type=Path);p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir();(a.output/'clips').mkdir();(a.output/'raw_objects').mkdir()
    rows=[r for r in csv.DictReader(a.objects_csv.open()) if r['class_id']=='74'];require(len(rows)==106,'object inventory count');index=[]; totals=Counter()
    with zipfile.ZipFile(a.decoded_zip) as z,zipfile.ZipFile(a.raw_zip) as rz:
        paths=sorted(n for n in z.namelist() if n.endswith('/AnimationClip.json')); seen=set()
        for path in paths:
            source=path.removeprefix('decoded/').removesuffix('/AnimationClip.json');binary=rz.read('unpacked/'+source); records=json.loads(z.read(path));
            for pid,clip in records.items():
                match=[r for r in rows if r['file']==source and r['path_id']==pid];require(len(match)==1,'source identity');r=match[0];off,size=int(r['offset']),int(r['size_bytes']);raw=binary[off:off+size];require(len(raw)==size and sha(raw)==r['object_sha256'],'raw hash');require((source,pid) not in seen,'duplicate source');seen.add((source,pid));v=normalize(clip,raw,source,pid)
                key=f'{len(index):03d}_{pid}';f=a.output/'clips'/(key+'.json');f.write_bytes(jsonbytes(v));(a.output/'raw_objects'/(key+'.bin')).write_bytes(raw)
                n=v['stream'];direct=v['direct_curves'];counts={'stream_curves':n['curve_count'],'stream_frames':len(n['frames']),'stream_keys':sum(len(f['keys']) for f in n['frames']),'stream_words':len(n['words']),'timed_frames':sum(f['kind']=='time' for f in n['frames']),'boundary_frames':sum(f['kind']!='time' for f in n['frames']),'dense_curves':v['dense']['m_CurveCount'],'dense_samples':len(v['dense']['m_SampleArray']),'constant_values':len(v['constant']),'direct_curves':sum(map(len,direct.values())),'direct_keys':sum(len(c.get('curve',{}).get('#299',[])) for cs in direct.values() for c in cs),'bindings':len(v['bindings']['genericBindings']),'events':len(v['events']),'loop_clips':int(v['loop'])};totals.update(counts)
                index.append({'source':source,'path_id':pid,'name':v['name'],'start':v['start'],'stop':v['stop'],'sample_rate':v['sample_rate'],'source_sha256':v['source_sha256'],'normalized_sha256':sha(f.read_bytes()),'json':'clips/'+f.name,'raw':'raw_objects/'+key+'.bin',**counts})
    require(len(seen)==106,'incomplete source set');(a.output/'index.json').write_bytes(jsonbytes(index));(a.output/'summary.json').write_bytes(jsonbytes({'clips':len(index),'totals':dict(totals),'runtime_verified':False,'binding_resolution':'AD-07'}));print(json.dumps(dict(totals)))
if __name__=='__main__':main()
