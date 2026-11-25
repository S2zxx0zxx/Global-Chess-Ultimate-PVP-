#!/usr/bin/env python3
"""Read AD-08 pack, preserve atlas coordinate space and verify UV/trim metadata."""
import argparse, collections, hashlib, io, json, math, zipfile
from pathlib import Path
import numpy as np
from PIL import Image

def need(ok,msg):
    if not ok: raise ValueError(msg)
def sha(b): return hashlib.sha256(b).hexdigest()
def uv_region(r, size, actual):
    x,y,w,h=map(int,r['fields']['bounds'].split(','));rot=int(r['fields'].get('rotate','0'));W,H=size;tw,th=actual
    need(rot in (0,90) and min(w,h,W,H,tw,th)>0,'unsupported dimensions/rotation')
    pw,ph=(h,w) if rot==90 else (w,h)
    need(x>=0 and y>=0 and x+pw<=W and y+ph<=H,'atlas bounds')
    ox,oy,ow,oh=map(int,r['fields'].get('offsets',f'0,0,{w},{h}').split(','))
    need(ox>=0 and oy>=0 and ox+w<=ow and oy+h<=oh,'trim bounds')
    u,v,u2,v2=x/W,y/H,(x+pw)/W,(y+ph)/H
    px=[u*tw,v*th,u2*tw,v2*th]
    need(all(math.isfinite(a) and 0<=a<=1 for a in (u,v,u2,v2)),'uv bounds')
    corners=[u2,v2,u,v2,u,v,u2,v] if rot==90 else [u,v2,u,v,u2,v,u2,v2]
    return {'name':r['name'],'bounds':[x,y,w,h],'rotation':rot,'offsets':[ox,oy,ow,oh],'uv':[u,v,u2,v2],'region_attachment_uvs':corners,'mapped_pixel_edges':px,'subpixel_edges':sum(abs(a-round(a))>1e-7 for a in px),'min_texel_span':min(px[2]-px[0],px[3]-px[1])}
def alpha(data):
    im=Image.open(io.BytesIO(data));im.verify();im=Image.open(io.BytesIO(data));a=np.asarray(im.convert('RGBA')).astype(np.int16);rgb=a[:,:,:3];al=a[:,:,3];mid=(al>0)&(al<255)
    return {'size':list(im.size),'transparent':int((al==0).sum()),'partial':int(mid.sum()),'opaque':int((al==255).sum()),'partial_rgb_gt_alpha_plus_2':int((mid & (rgb.max(axis=2)>al+2)).sum()),'transparent_nonzero_rgb':int(((al==0)&(rgb.max(axis=2)>0)).sum())}
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('pack',type=Path);p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir(exist_ok=True)
    with zipfile.ZipFile(a.pack) as z:
        def get(n):return json.loads(z.read(n+'.json'))
        atlas=get('atlases');textures=get('textures');links=get('page_links');variants=get('variant_candidates');index=get('prepared_file_index');files={(r['category'],r['id']):r for r in index};stats={};out=[];regs=[];variant_rows=[]
        for tid,t in textures.items():
            f=files['textures',tid];data=z.read(f['path']);need(sha(data)==f['sha256']==t['sha256'],'texture hash');s=alpha(data);need(s['size']==t['size'],'texture dimensions');stats[tid]=s
        for v in variants:
            need(len(v['texture_candidates'])==1 and len(atlas[v['atlas_id']])==1,'ambiguous variant');t=v['texture_candidates'][0]['id'];pg=atlas[v['atlas_id']][0];links.append({'atlas_text_id':v['atlas_id'],'page':pg['name'],'texture_id':t,'declared_size':pg['size'],'texture_size':textures[t]['size'],'candidate':True});variant_rows.append({'skeleton_id':v['skeleton_id'],'atlas_id':v['atlas_id'],'texture_id':t,'status':'geometry_candidate_only'})
        for l in links:
            candidates=[p for p in atlas[l['atlas_text_id']] if p['name']==l['page']];need(len(candidates)==1,'page ambiguity');pg=candidates[0];W,H=pg['size'];tw,th=l['texture_size'];need(pg['size']==l['declared_size'] and stats[l['texture_id']]['size']==[tw,th],'size evidence')
            rs=[uv_region(r,[W,H],[tw,th]) for r in pg['regions']];regs.extend({'atlas_id':l['atlas_text_id'],'page':l['page'],**r} for r in rs)
            mat=l.get('material_keywords');pma=pg['fields'].get('pma');need(pg['fields']['filter']=='Linear,Linear','unexpected filter')
            if mat is not None:need(l['maintex_scale']=={'x':1.0,'y':1.0} and l['maintex_offset']=={'x':0.0,'y':0.0},'nonidentity material transform')
            out.append({'atlas_id':l['atlas_text_id'],'page':l['page'],'texture_id':l['texture_id'],'candidate':l.get('candidate',False),'declared_size':[W,H],'actual_size':[tw,th],'scale':[tw/W,th/H],'same_size':[W,H]==[tw,th],'actual_power_of_two':all(x>0 and x&(x-1)==0 for x in (tw,th)),'regions':len(rs),'subpixel_regions':sum(r['subpixel_edges']>0 for r in rs),'min_texel_span':min(r['min_texel_span'] for r in rs),'atlas_pma':pma,'straight_alpha_keyword':None if mat is None else '_STRAIGHT_ALPHA_INPUT' in mat,'alpha_diagnostics':stats[l['texture_id']],'alpha_status':'requires_shader_and_pixel_render_QA'})
        need(len(out)==52 and len(regs)==1435,'coverage');linked=[r for r in out if not r['candidate']];mismatch=[r for r in linked if not r['same_size']];summary={'pages':len(out),'linked_pages':len(linked),'linked_mismatches':len(mismatch),'mismatch_actual_power_of_two':sum(r['actual_power_of_two'] for r in mismatch),'mismatch_nonuniform_scale':sum(abs(r['scale'][0]-r['scale'][1])>1e-12 for r in mismatch),'regions':len(regs),'rotated_regions':sum(r['rotation']==90 for r in regs),'trimmed_regions':sum(r['offsets']!=[0,0,r['bounds'][2],r['bounds'][3]] for r in regs),'subpixel_regions':sum(r['subpixel_edges']>0 for r in regs),'min_texel_span':min(r['min_texel_span'] for r in regs),'textures':len(stats),'candidate_pages':len(variant_rows),'explicit_pma_pages':sum(r['atlas_pma']=='true' for r in out),'straight_keyword_pages':sum(r['straight_alpha_keyword'] is True for r in linked),'pma_keyword_absent_pages':sum(r['straight_alpha_keyword'] is False for r in linked),'pixel_pma_inconsistent_textures':sum(s['partial_rgb_gt_alpha_plus_2']>0 or s['transparent_nonzero_rgb']>0 for s in stats.values()),'runtime_parity':False}
        for name,val in [('summary',summary),('page_uv_audit',out),('region_uv_audit',regs),('texture_alpha_audit',stats),('variant_review',variant_rows)]: (a.output/(name+'.json')).write_text(json.dumps(val,indent=2)+'\n')
        print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
