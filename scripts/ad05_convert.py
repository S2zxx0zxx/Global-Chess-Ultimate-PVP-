#!/usr/bin/env python3
"""Reconstruct original FSB5 Vorbis packets into Ogg, then decode float WAV.
Requires Python 3, Linux libvorbis, ffmpeg, numpy and soundfile.
No resampling, normalization, synthetic replacements, or lossy re-encoding.
Run only on locally authorized banks; outputs stay outside the public checkout.
"""
import argparse, csv, ctypes as C, hashlib, json, pathlib, re, struct, subprocess, zipfile, zlib
import numpy as np
import soundfile as sf

SETUPS={'20591e7a':4225,'b6b3868b':3832,'28f00387':3484,'d6e0bbd4':3771}
PIN='d9875b1fff307e4759dfb85e49e3d5e6fb196f7c'
def require(ok,msg):
    if not ok: raise ValueError(msg)
def sha(x): return hashlib.sha256(x).hexdigest()
class Info(C.Structure):
    _fields_=[('version',C.c_int),('channels',C.c_int),('rate',C.c_long),('bitrate_upper',C.c_long),('bitrate_nominal',C.c_long),('bitrate_lower',C.c_long),('bitrate_window',C.c_long),('codec_setup',C.c_void_p)]
class Comment(C.Structure):
    _fields_=[('user_comments',C.c_void_p),('comment_lengths',C.c_void_p),('comments',C.c_int),('vendor',C.c_void_p)]
class Packet(C.Structure):
    _fields_=[('packet',C.c_void_p),('bytes',C.c_long),('b_o_s',C.c_long),('e_o_s',C.c_long),('granulepos',C.c_int64),('packetno',C.c_int64)]
v=C.CDLL('libvorbis.so.0')
for name,args,ret in [('vorbis_info_init',[C.POINTER(Info)],None),('vorbis_info_clear',[C.POINTER(Info)],None),('vorbis_comment_init',[C.POINTER(Comment)],None),('vorbis_comment_clear',[C.POINTER(Comment)],None),('vorbis_synthesis_headerin',[C.POINTER(Info),C.POINTER(Comment),C.POINTER(Packet)],C.c_int),('vorbis_packet_blocksize',[C.POINTER(Info),C.POINTER(Packet)],C.c_long)]:
    f=getattr(v,name);f.argtypes=args;f.restype=ret

def op(data,i):
    buf=C.create_string_buffer(data)
    return Packet(C.cast(buf,C.c_void_p),len(data),i==0,0,0,i),buf

def headers(setup,ch,rate):
    return [b'\x01vorbis'+struct.pack('<IBIiiiBB',0,ch,rate,0,0,0,0xb8,1),b'\x03vorbis'+struct.pack('<II',0,0)+b'\x01',setup]

def granules(h,packets):
    vi=Info();vc=Comment();v.vorbis_info_init(C.byref(vi));v.vorbis_comment_init(C.byref(vc));out=[]
    try:
        for i,p in enumerate(h):
            o,buf=op(p,i);r=v.vorbis_synthesis_headerin(C.byref(vi),C.byref(vc),C.byref(o));require(r==0,f'Vorbis header {i}: {r}')
        last=0;g=0
        for i,p in enumerate(packets,3):
            o,buf=op(p,i);bs=v.vorbis_packet_blocksize(C.byref(vi),C.byref(o));require(bs in (256,2048),'unexpected blocksize')
            if last:g+=(last+bs)//4
            out.append(g);last=bs
    finally:v.vorbis_comment_clear(C.byref(vc));v.vorbis_info_clear(C.byref(vi))
    return out

def read_bank(data):
    require(len(data)>=68,'short bank')
    magic,ver,count,h,n,d,codec=struct.unpack_from('<4s6I',data)
    require((magic,ver,count,codec)==(b'FSB5',1,1,15),'unsupported bank')
    end=60+h;start=end+n;require(end>=68 and start+d==len(data),'bank length')
    mode=struct.unpack_from('<Q',data,60)[0]
    require(((mode>>7)&0x7ffffff)==0 and ((mode>>1)&15)==8 and ((mode>>5)&3) in (0,1),'unsupported profile')
    ch=1+((mode>>5)&3);samples=mode>>34;require(samples>0,'no samples')
    p=68;more=mode&1;setup=None
    while more:
        require(p+4<=end,'truncated flag');flag=struct.unpack_from('<I',data,p)[0];p+=4
        more,size,kind=flag&1,(flag>>1)&0xffffff,flag>>25
        require(p+size<=end and kind==11 and setup is None and size>=8,'unexpected metadata')
        sid,seek=struct.unpack_from('<II',data,p);setup=f'{sid:08x}';require(seek==size-8,'seek table size');p+=size
    require(setup in SETUPS and not any(data[p:end]),'setup or padding')
    p=start;packets=[]
    while p+2<=len(data):
        size=struct.unpack_from('<H',data,p)[0]
        if not size or size==65535:break
        p+=2;require(p+size<=len(data),'truncated packet');packets.append(data[p:p+size]);p+=size
    require(len(packets)>=2 and not any(data[p:]),'packet count or padding')
    return setup,ch,44100,samples,packets

CRC_TABLE=[]
for i in range(256):
    x=i<<24
    for _ in range(8):x=((x<<1)&0xffffffff)^(0x04c11db7 if x&0x80000000 else 0)
    CRC_TABLE.append(x)
def crc_ogg(buf):
    crc=0
    for v in buf:crc=((crc<<8)&0xffffffff)^CRC_TABLE[(crc>>24)^v]
    return crc

def page(packet,seq,granule,flags,serial):
    lacing=bytes([255]*(len(packet)//255)+[len(packet)%255]);require(len(lacing)<=255,'packet too big')
    b=bytearray(struct.pack('<4sBBQIIIB',b'OggS',0,flags,granule,serial,seq,0,len(lacing))+lacing+packet)
    struct.pack_into('<I',b,22,crc_ogg(b));return b

def make_ogg(h,pa,g,declared,serial):
    require(g[-2]<=declared<=g[-1],'invalid final granule')
    return b''.join([page(p,i,0,2 if i==0 else 0,serial) for i,p in enumerate(h)]+[page(p,i+3,declared if i==len(pa)-1 else g[i],4 if i==len(pa)-1 else 0,serial) for i,p in enumerate(pa)])

def verify_ogg(blob,expected,declared):
    p=0;seq=0;last=0;pack=[];serial=None
    while p<len(blob):
        require(p+27<=len(blob),'short Ogg header')
        magic,version,flags,g,s,n,crc,l=struct.unpack_from('<4sBBQIIIB',blob,p)
        require(magic==b'OggS' and version==0 and n==seq and g>=last,'Ogg page metadata')
        if serial is None:serial=s
        require(s==serial and p+27+l<=len(blob),'page serial/lacing')
        lace=blob[p+27:p+27+l];require(l>0 and lace[-1]<255 and all(x==255 for x in lace[:-1]),'one-packet page lacing')
        end=p+27+l+sum(lace);require(end<=len(blob),'page bounds')
        raw=bytearray(blob[p:end]);struct.pack_into('<I',raw,22,0);require(crc_ogg(raw)==crc,'Ogg CRC')
        require(flags==(2 if seq==0 else 4 if end==len(blob) else 0),'page flags')
        pack.append(blob[p+27+l:end]);seq+=1;last=g;p=end
    require(pack==expected and last==declared,'packet or granule mismatch')
    return seq

def load_setups(source):
    out={}
    for ident,n in SETUPS.items():
        if source.is_dir():b=(source/(ident+'.bin')).read_bytes()
        else:
            m=re.search(r'static const uint8_t vcb_'+ident+r'\[\]\s*=\s*\{(.*?)\};',source.read_text(),re.S);require(m is not None,'missing codebook')
            b=bytes(int(x,16) for x in re.findall(r'0x([0-9a-fA-F]{2})\b',m[1]))
        require(len(b)==n and b.startswith(b'\x05vorbis') and zlib.crc32(b)==int(ident,16),'invalid codebook '+ident);out[ident]=b
    return out

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('archive',type=pathlib.Path);p.add_argument('manifest',type=pathlib.Path);p.add_argument('codebooks',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);a=p.parse_args()
    require(not a.output.exists(),'output directory must be new');a.output.mkdir(parents=True);(a.output/'ogg').mkdir();(a.output/'wav').mkdir()
    books=load_setups(a.codebooks);rows=list(csv.DictReader(a.manifest.open()));expected={r['file']:r for r in rows};require(len(rows)==len(expected)==44,'expected 44 source IDs')
    results=[]
    with zipfile.ZipFile(a.archive) as z:
        members=[i for i in z.infolist() if i.filename.startswith('audio_raw/') and i.filename.endswith('.fsb')]
        require(len(members)==44 and {i.filename for i in members}==expected.keys(),'source set differs')
        for i in sorted(members,key=lambda x:x.filename):
            name=pathlib.PurePosixPath(i.filename).stem;row={'source':i.filename,'status':'failed'}
            ogg=a.output/'ogg'/(name+'.ogg');wav=a.output/'wav'/(name+'.wav')
            try:
                require(i.file_size<=16*1024*1024,'oversized bank');data=z.read(i);digest=sha(data);require(digest==expected[i.filename]['sha256'],'source hash mismatch')
                setup,ch,rate,samples,pa=read_bank(data);h=headers(books[setup],ch,rate);g=granules(h,pa)
                blob=make_ogg(h,pa,g,samples,int(digest[:8],16));pages=verify_ogg(blob,h+pa,samples);ogg.write_bytes(blob)
                x,sr=sf.read(ogg,dtype='float32',always_2d=True);require(sr==rate and x.shape==(samples,ch) and np.isfinite(x).all(),'libsndfile decode shape/nonfinite')
                proc=subprocess.run(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(ogg),'-f','f32le','-acodec','pcm_f32le','-'],capture_output=True,timeout=90,check=False)
                require(proc.returncode==0,'ffmpeg decode: '+proc.stderr.decode(errors='replace')[:1000]);y=np.frombuffer(proc.stdout,dtype='<f4').reshape(-1,ch)
                require(y.shape==x.shape and np.isfinite(y).all(),'ffmpeg shape/nonfinite');diff=float(np.max(np.abs(x-y)));require(diff<0.0001,'decoder PCM divergence')
                require(np.any(x!=0),'silent decoded signal');sf.write(wav,x,rate,subtype='FLOAT');w,wr=sf.read(wav,dtype='float32',always_2d=True);require(wr==rate and np.array_equal(w,x),'WAV roundtrip')
                row.update(status='pass',source_sha256=digest,setup_id=setup,rate=rate,channels=ch,samples=samples,duration_seconds=samples/rate,packets=len(pa),pages=pages,packet_payload_sha256=sha(b''.join(pa)),ogg_path='ogg/'+ogg.name,ogg_sha256=sha(blob),ogg_bytes=len(blob),wav_path='wav/'+wav.name,wav_sha256=sha(wav.read_bytes()),wav_bytes=wav.stat().st_size,pcm_sha256=sha(x.astype('<f4',copy=False).tobytes()),peak=float(np.max(np.abs(x))),rms=float(np.sqrt(np.mean(x.astype('float64')**2))),max_decoder_difference=diff,trimmed_final_samples=g[-1]-samples)
            except Exception as e:
                row['error']=str(e);ogg.unlink(missing_ok=True);wav.unlink(missing_ok=True)
            results.append(row);print(name,row['status'],row.get('error',''),flush=True)
    report={'source_pin':PIN,'source_archive_sha256':sha(a.archive.read_bytes()),'codebook_sha256':{k:sha(b) for k,b in books.items()},'method':'original Vorbis packet remux; float WAV via libsndfile; FFmpeg independent full decode','libsndfile_version':sf.__libsndfile_version__,'results':results}
    (a.output/'conversion_report.json').write_text(json.dumps(report,indent=2)+'\n');fields=list(dict.fromkeys(k for r in results for k in r))
    with (a.output/'conversion_manifest.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(results)
    if any(r['status']!='pass' for r in results):raise SystemExit(1)
if __name__=='__main__':main()
