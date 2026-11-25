#!/usr/bin/env python3
"""Recover declared managed field inventories, not stripped Unity serialization schemas."""
import argparse,hashlib,json,struct,zipfile,collections
from pathlib import Path

def parse(b):
    assert struct.unpack_from('<II',b)==(0xfab11baf,31)
    first=struct.unpack_from('<I',b,8)[0];assert first==256
    pairs=[struct.unpack_from('<II',b,p) for p in range(8,first,8)]
    assert all(o+n<=len(b) for o,n in pairs)
    so,sn=pairs[2];fo,fn=pairs[11];to,tn=pairs[19];io,ins=pairs[20]
    assert fn%12==tn%88==ins%40==0
    def string(i):
        assert 0<=i<sn
        return b[so+i:b.index(0,so+i,so+sn)].decode('utf8')
    fields=[]
    for i in range(fn//12):
        name,typ,token=struct.unpack_from('<III',b,fo+i*12);assert token>>24==4
        fields.append({'name':string(name),'type_index':typ,'token':f'{token:08x}'})
    types=[]
    for i in range(tn//88):
        v=struct.unpack_from('<16i8HII',b,to+i*88);name,ns,byval,decl,parent,element,generic,flags,start=v[:9];count=v[18];token=v[-1];assert token>>24==2
        assert (count==0 or 0<=start<=len(fields)-count)
        types.append({'index':i,'name':string(name),'namespace':string(ns),'byval_type_index':byval,'parent_type_index':parent,'declaring_type_index':decl,'token':f'{token:08x}','fields':fields[start:start+count] if count else []})
    owners={}
    for i in range(ins//40):
        v=struct.unpack_from('<10i',b,io+i*40);name=string(v[0]);start,count=v[2:4];assert 0<=start<=len(types)-count
        for j in range(start,start+count):assert j not in owners;owners[j]=name.removesuffix('.dll')
    assert len(owners)==len(types)
    byval=collections.defaultdict(list)
    for t in types:t['assembly']=owners[t['index']];byval[t['byval_type_index']].append(t)
    return types,byval,fields

def main():
    p=argparse.ArgumentParser();p.add_argument('raw_zip',type=Path);p.add_argument('headers',type=Path);p.add_argument('out',type=Path);a=p.parse_args()
    with zipfile.ZipFile(a.raw_zip) as z:b=z.read('assets/bin/Data/Managed/Metadata/global-metadata.dat')
    types,byval,fields=parse(b);lookup=collections.defaultdict(list)
    for t in types:lookup[t['assembly'],t['namespace'],t['name']].append(t)
    rows=[]
    for r in json.loads(a.headers.read_text()):
        sc=r.get('script_identity');row={'source':r['source'],'class_id':r['class_id'],'sha256':r['sha256'],'body_bytes':r['raw_bytes']-r.get('body_offset',0),'status':'no_managed_script'}
        if sc:
            key=(sc['m_AssemblyName'],sc['m_Namespace'],sc['m_ClassName']);matches=lookup[key];row['identity']=key;row['candidate_count']=len(matches)
            if len(matches)==1:
                t=matches[0];chain=[];seen=set()
                while t and t['index'] not in seen:
                    seen.add(t['index']);chain.append({k:t[k] for k in ['assembly','namespace','name','index','token','fields']});parents=byval[t['parent_type_index']];t=parents[0] if len(parents)==1 else None
                for c in chain:
                    for f in c['fields']:
                        known=byval[f['type_index']];f['direct_type_definition']=[{'assembly':x['assembly'],'namespace':x['namespace'],'name':x['name']} for x in known]
                row.update(status='managed_declaration_resolved',declaration_chain=chain,serialization_schema_verified=False)
            else:row['status']='managed_declaration_unresolved'
        rows.append(row)
    unique={tuple(r['identity']) for r in rows if r['status']=='managed_declaration_resolved'}
    report={'metadata_sha256':hashlib.sha256(b).hexdigest(),'metadata_version':31,'type_definitions':len(types),'field_definitions':len(fields),'records':len(rows),'status_counts':dict(collections.Counter(r['status'] for r in rows)),'unique_resolved_script_types':len(unique),'scope':'Exact original metadata declaration names, field tokens, type indices and uniquely resolvable base definitions. Not serialized field offsets/order/attributes; no claim of recovered Unity type tree.','rows':rows};a.out.write_text(json.dumps(report,indent=2)+'\n');print({k:v for k,v in report.items() if k!='rows'})
if __name__=='__main__':main()
