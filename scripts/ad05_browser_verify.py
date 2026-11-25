#!/usr/bin/env python3
"""Offline Chromium audio decoding and sample-accurate playback contract."""
import argparse, base64, json, pathlib
from playwright.sync_api import sync_playwright

def main():
    p=argparse.ArgumentParser();p.add_argument('directory',type=pathlib.Path);p.add_argument('--chromium',default='/usr/bin/chromium');a=p.parse_args()
    d=a.directory.resolve();rows=json.loads((d/'conversion_report.json').read_text())['results'];assert len(rows)==44 and all(r['status']=='pass' for r in rows)
    out=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox']);page=browser.new_page()
        for r in rows:
            try:
                x=page.evaluate('''async r => {
                    const ctx=new OfflineAudioContext(r.channels,r.samples,r.rate);
                    const decode=async b=>ctx.decodeAudioData(Uint8Array.from(atob(b),c=>c.charCodeAt(0)).buffer);
                    const ogg=await decode(r.ogg),wav=await decode(r.wav);
                    for(const b of [ogg,wav])if(b.numberOfChannels!==r.channels||b.sampleRate!==r.rate)throw Error('decode format');
                    if(wav.length!==r.samples||![r.samples,r.samples+r.padding].includes(ogg.length))throw Error('decode lengths '+[wav.length,ogg.length]);
                    const trimmed=ctx.createBuffer(r.channels,r.samples,r.rate);let prefixDiff=0;
                    for(let c=0;c<r.channels;c++){
                        const x=ogg.getChannelData(c).subarray(0,r.samples),y=wav.getChannelData(c);
                        for(let i=0;i<x.length;i++){if(!Number.isFinite(x[i])||!Number.isFinite(y[i]))throw Error('nonfinite');prefixDiff=Math.max(prefixDiff,Math.abs(x[i]-y[i]));}
                        trimmed.copyToChannel(x,c);
                    }
                    if(prefixDiff>0.0001)throw Error('PCM difference '+prefixDiff);
                    const src=ctx.createBufferSource();src.buffer=trimmed;src.connect(ctx.destination);src.start(0);
                    const rendered=await ctx.startRendering();let peak=0,diff=0;
                    for(let c=0;c<r.channels;c++){const x=wav.getChannelData(c),y=rendered.getChannelData(c);for(let i=0;i<x.length;i++){peak=Math.max(peak,Math.abs(y[i]));diff=Math.max(diff,Math.abs(x[i]-y[i]));}}
                    if(peak===0||diff>0.0001)throw Error('render mismatch');
                    return {ogg_raw_frames:ogg.length,wav_frames:wav.length,rendered_frames:rendered.length,padding_frames:ogg.length-r.samples,prefix_difference:prefixDiff,render_difference:diff,peak};
                }''',{'ogg':base64.b64encode((d/r['ogg_path']).read_bytes()).decode(),'wav':base64.b64encode((d/r['wav_path']).read_bytes()).decode(),'channels':r['channels'],'samples':r['samples'],'rate':r['rate'],'padding':r['trimmed_final_samples']})
                out.append({'source':r['source'],'status':'pass',**x})
            except Exception as e:out.append({'source':r['source'],'status':'fail','error':str(e)})
        version=browser.version;browser.close()
    (d/'browser_verification.json').write_text(json.dumps({'browser':version,'method':'Web Audio decode both files, compare prefix PCM, trim OGG to source sample count, offline render','results':out},indent=2)+'\n')
    print('browser',version,'pass',sum(x['status']=='pass' for x in out),'total',len(out));print([x for x in out if x['status']!='pass'])
    if any(x['status']!='pass' for x in out):raise SystemExit(1)
if __name__=='__main__':main()
