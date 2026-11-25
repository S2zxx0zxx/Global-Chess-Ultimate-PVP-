#!/usr/bin/env python3
"""Read-only UI hierarchy and component inventory; no callback execution."""
import argparse, collections as C, csv, hashlib, json, struct, zipfile
from pathlib import Path

def sha(b): return hashlib.sha256(b).hexdigest()
def safe(v):
    if isinstance(v,dict): return {k:str(x) if k=='m_PathID' else safe(x) for k,x in v.items()}
    if isinstance(v,list): return [safe(x) for x in v]
    return v

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('decoded',type=Path);p.add_argument('raw',type=Path);p.add_argument('manifest',type=Path);p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir(exist_ok=False)
    inv={(r['file'],r['path_id']):r for r in csv.DictReader((a.manifest/'unity_objects.csv').open())}
    ext={(r['source_file'],int(r['file_id'])):r['target_file'] for r in csv.DictReader((a.manifest/'external_tables.csv').open()) if r['status']=='mapped_file'}
    def ref(f,p): return (f if p['m_FileID']==0 else ext.get((f,p['m_FileID'])),str(p['m_PathID']))
    def write(n,v): (a.output/(n+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
    with zipfile.ZipFile(a.decoded) as z,zipfile.ZipFile(a.raw) as rz:
        prefixes=[n.removeprefix('decoded/').removesuffix('/GameObject.json') for n in z.namelist() if n.startswith('decoded/') and n.endswith('/GameObject.json')];cache={};docs={}
        def load(f,t):
            k=(f,t)
            if k not in docs:
                n='decoded/'+f+'/'+t+'.json';docs[k]=json.loads(z.read(n)) if n in z.namelist() else {}
            return docs[k]
        def raw(k):
            f,i=k;r=inv[k]
            if f not in cache:cache[f]=rz.read('unpacked/'+f)
            b=cache[f][int(r['offset']):int(r['offset'])+int(r['size_bytes'])];assert len(b)==int(r['size_bytes']) and sha(b)==r['object_sha256'],k;return b
        pref=next(f for f in prefixes if f.startswith('Prefab/'));nodes={};components={};issues=[];stats=C.Counter();rootmap={};canvases=[]
        for f in prefixes:
            gos=load(f,'GameObject');ts={**load(f,'Transform'),**load(f,'RectTransform')};mb=load(f,'MonoBehaviour');bygo=C.defaultdict(list)
            for tid,t in ts.items():
                raw((f,tid));g=ref(f,t.get('#374',t.get('m_GameObject')));bygo[g].append(tid)
            for gid,g in gos.items():
                k=(f,gid);b=raw(k);ids=[ref(f,c['component']) for c in g['m_Component']];assert struct.unpack_from('<i',b)[0]==len(ids);assert all(struct.pack('<iq',c['component']['m_FileID'],c['component']['m_PathID'])==b[4+i*12:16+i*12] for i,c in enumerate(g['m_Component'])),k
                tids=bygo[k];t=ts[tids[0]] if len(tids)==1 else None
                if t is None:issues.append({'source':k,'issue':'transform_count','count':len(tids)})
                rec={'source':k,'name':g['m_Name'],'active':g['m_IsActive'],'layer':g['m_Layer'],'transform':tids[0] if t else None,'layout':safe(t),'parent':ref(f,t['m_Father']) if t and t['m_Father']['m_PathID'] else None,'children':[ref(f,x) for x in t['m_Children']] if t else [],'components':ids};nodes[k]=rec
                for c in ids:
                    if c not in inv:issues.append({'source':k,'issue':'component_missing','target':c});continue
                    r=inv[c];cb=raw(c);kind=r['type'];payload=load(c[0],kind).get(c[1]);script=None
                    if c[1] in mb and c[0]==f:
                        payload=mb[c[1]];sk=ref(f,payload['m_Script']);script=load(sk[0],'MonoScript').get(sk[1]) if sk[0] else None
                    name=script['m_ClassName'] if script else kind
                    if len(cb)>=12 and c[0]==f and struct.unpack_from('<iq',cb)==(0,int(gid)):owner_verified=True
                    else:owner_verified=False;issues.append({'source':k,'issue':'component_owner_unverified','target':c})
                    components[c]={'source':c,'owner':k,'class_id':r['class_id'],'type':kind,'script':name,'script_identity':safe(script),'owner_verified':owner_verified,'sha256':r['object_sha256'],'metadata':safe(payload)}
                    if r['class_id']=='223':canvases.append(components[c])
        tmap={(k[0],n['transform']):k for k,n in nodes.items() if n['transform']}
        for k,n in nodes.items():
            if n['parent']:
                par=tmap.get(n['parent']);n['parent_go']=par
                if not par or (k[0],n['transform']) not in nodes[par]['children']:issues.append({'source':k,'issue':'parent_reciprocity','target':n['parent']})
            else:n['parent_go']=None
            for child in n['children']:
                ck=tmap.get(child)
                if not ck or nodes[ck]['parent']!=(k[0],n['transform']):issues.append({'source':k,'issue':'child_reciprocity','target':child})
        for k,n in nodes.items():
            chain=[];seen=set();q=k
            while q is not None:
                assert q not in seen,('hierarchy cycle',q);seen.add(q);chain.append(q);q=nodes[q]['parent_go']
            n['root']=chain[-1];n['hierarchy_path']='/'.join(nodes[i]['name'] for i in reversed(chain));n['depth']=len(chain)-1
            n['sibling_index']=nodes[n['parent_go']]['children'].index((k[0],n['transform'])) if n['parent_go'] and (k[0],n['transform']) in nodes[n['parent_go']]['children'] else None
            rootmap.setdefault(chain[-1],[]).append(k)
        bundle=next(iter(load(pref,'AssetBundle').values()));paths=[{'path':x['first'],'target':ref(pref,x['second']['asset'])} for x in bundle['m_Container']]
        def config(t):
            n=next(n for n in z.namelist() if '/text/'+t+'__' in n and n.startswith('decoded/Config/'));return {'source':n,'sha256':sha(z.read(n)),'rows':[line.split('\t') for line in z.read(n).decode('utf-8-sig').splitlines() if line.strip() and not line.startswith('#')]}
        cfg={t:config(t) for t in ['UIForm','UIGroup','UISound','AssetsPath']}
        ed=[r for r in csv.DictReader((a.manifest/'dependency_edges.csv').open()) if (r['source_file'],r['source_id']) in components or (r['source_file'],r['source_id']) in nodes]
        for r in ed:r['owner']=components.get((r['source_file'],r['source_id']),{}).get('owner',(r['source_file'],r['source_id']))
        roots=[]
        for k,ks in rootmap.items():
            cc=[components[c] for g in ks for c in nodes[g]['components'] if c in components];roots.append({'root':k,'name':nodes[k]['name'],'objects':len(ks),'component_types':dict(C.Counter(c['script'] for c in cc)),'container_paths':[p['path'] for p in paths if p['target']==k]})
        prefab_nodes=[n for k,n in nodes.items() if k[0]==pref];pc=[c for k,c in components.items() if k[0]==pref];summary={'sources':len(prefixes),'objects':len(nodes),'components':len(components),'roots':len(roots),'prefab_objects':len(prefab_nodes),'prefab_rect_transforms':sum(inv[pref,n['transform']]['class_id']=='224' for n in prefab_nodes if n['transform']),'prefab_roots':sum(r['root'][0]==pref for r in roots),'prefab_components':len(pc),'prefab_component_types':dict(C.Counter(c['script'] for c in pc)),'canvas_records':len(canvases),'container_references':len(paths),'distinct_container_paths':len({r['path'] for r in paths}),'dependency_occurrences':len(ed),'dependency_status':dict(C.Counter(r['status'] for r in ed)),'issues':dict(C.Counter(i['issue'] for i in issues)),'config_rows':{k:len(v['rows']) for k,v in cfg.items()},'source_scope':prefixes}
        for name,data in [('summary',summary),('nodes',list(nodes.values())),('components',list(components.values())),('roots',roots),('container_paths',paths),('configuration',cfg),('canvases',canvases),('dependencies',ed),('unresolved',issues)]:write(name,data)
        print(json.dumps({k:v for k,v in summary.items() if k!='prefab_component_types'},indent=2))
if __name__=='__main__':main()
