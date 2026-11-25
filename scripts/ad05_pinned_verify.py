#!/usr/bin/env python3
"""Verify independent direct FSB decoding using the pinned vgmstream CLI."""
import argparse, hashlib, json, pathlib, subprocess, tempfile, zipfile
import numpy as np
import soundfile as sf

def main():
    p=argparse.ArgumentParser();p.add_argument('archive',type=pathlib.Path);p.add_argument('directory',type=pathlib.Path);p.add_argument('decoder',type=pathlib.Path);a=p.parse_args()
    rows=json.loads((a.directory/'conversion_report.json').read_text())['results'];assert len(rows)==44
    cli=a.decoder.resolve(strict=True);results=[]
    with zipfile.ZipFile(a.archive) as z,tempfile.TemporaryDirectory() as tmp:
        t=pathlib.Path(tmp)
        for r in rows:
            try:
                data=z.read(r['source']);assert hashlib.sha256(data).hexdigest()==r['source_sha256'];src=t/pathlib.PurePosixPath(r['source']).name;src.write_bytes(data);dst=t/'decoded.wav'
                proc=subprocess.run([str(cli),'-i','-W','4','-o',str(dst),str(src)],capture_output=True,text=True,timeout=90);assert proc.returncode==0,proc.stderr+proc.stdout
                x,rate=sf.read(dst,dtype='float32',always_2d=True);y,yr=sf.read(a.directory/r['wav_path'],dtype='float32',always_2d=True)
                assert x.shape==y.shape==(r['samples'],r['channels']) and rate==yr==r['rate'] and np.isfinite(x).all()
                diff=float(np.max(np.abs(x-y)));assert diff<=0.0001,diff
                results.append({'source':r['source'],'status':'pass','samples':len(x),'channels':r['channels'],'rate':rate,'max_difference':diff,'decoded_peak':float(np.max(np.abs(x)))})
                src.unlink();dst.unlink()
            except Exception as e:results.append({'source':r['source'],'status':'fail','error':str(e)});(t/'decoded.wav').unlink(missing_ok=True)
    (a.directory/'pinned_decoder_verification.json').write_text(json.dumps({'decoder_sha256':hashlib.sha256(cli.read_bytes()).hexdigest(),'results':results},indent=2)+'\n')
    print('pinned decoder',sum(r['status']=='pass' for r in results),'/',len(results),'max difference',max((r.get('max_difference',0) for r in results),default=0));print([r for r in results if r['status']!='pass'])
    if any(r['status']!='pass' for r in results):raise SystemExit(1)
if __name__=='__main__':main()
