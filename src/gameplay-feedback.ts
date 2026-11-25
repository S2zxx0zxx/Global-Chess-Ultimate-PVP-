import type {GameplayEvent} from './gameplay-events.ts';
export const FEEDBACK_KEY='gcu.feedback.v1';
export type FeedbackPrefs={sound:boolean;volume:number;resultVolume:number;haptics:boolean};
export const DEFAULT_FEEDBACK:FeedbackPrefs={sound:false,volume:.55,resultVolume:.65,haptics:false};
const clamp=(v:unknown,d:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(1,v)):d;
export function normalizeFeedback(value:unknown,legacyHaptics=false):FeedbackPrefs{
 const x=value&&typeof value==='object'?value as Partial<FeedbackPrefs>:{};
 return {sound:x.sound===true,volume:clamp(x.volume,.55),resultVolume:clamp(x.resultVolume,.65),haptics:typeof x.haptics==='boolean'?x.haptics:legacyHaptics};
}
export type Cue='start'|'pick'|'move'|'capture'|'check'|'promotion'|'invalid'|'result';
export interface AudioPort{unlock():Promise<boolean>;play(cue:Cue,gain:number):boolean;stop():void;dispose():void;}
export const CUES:readonly Cue[]=['start','pick','move','capture','check','promotion','invalid','result'];
const shape:Record<Cue,{duration:number;freq:number;end:number;mix:number}>={
 start:{duration:.21,freq:330,end:490,mix:.12},pick:{duration:.055,freq:550,end:340,mix:.25},move:{duration:.09,freq:230,end:120,mix:.45},
 capture:{duration:.14,freq:160,end:65,mix:.55},check:{duration:.16,freq:490,end:340,mix:.08},promotion:{duration:.2,freq:290,end:600,mix:.1},
 invalid:{duration:.075,freq:145,end:90,mix:.15},result:{duration:.32,freq:320,end:180,mix:.08}
};
// Original deterministic, non-musical short sound effects; no recordings, source asset or network.
export function synthesize(cue:Cue,rate=24000):Float32Array{
 if(!Number.isInteger(rate)||rate<8000||rate>96000)throw RangeError('sample rate');
 const s=shape[cue],n=Math.ceil(s.duration*rate),out=new Float32Array(n);
 let phase=0,random=0x1a2b3c4d;
 for(let i=0;i<n;i++){
  const t=i/(n-1),f=s.freq+(s.end-s.freq)*t;
  phase+=2*Math.PI*f/rate;random=(Math.imul(random,1664525)+1013904223)>>>0;
  const noise=(random/4294967296)*2-1,envelope=Math.min(1,i/(rate*.004))*Math.pow(1-t,2);
  out[i]=.38*envelope*((1-s.mix)*Math.sin(phase)+s.mix*noise);
 }
 return out;
}
export const MAX_VOICES=2;
export class WebAudioPort implements AudioPort{
 private context:AudioContext|null=null;
 private buffers=new Map<Cue,AudioBuffer>();
 private voices=new Map<AudioBufferSourceNode,GainNode>();
 private disposed=false;
 async unlock(){
  if(this.disposed)return false;
  try{
   if(!this.context){
    if(typeof AudioContext==='undefined')return false;
    this.context=new AudioContext();
    for(const cue of CUES){const a=synthesize(cue),buf=this.context.createBuffer(1,a.length,24000);buf.getChannelData(0).set(a);this.buffers.set(cue,buf);}
   }
   if(this.context.state==='suspended')await this.context.resume();
   return !this.disposed&&this.context.state==='running';
  }catch{return false;}
 }
 play(cue:Cue,gain:number){
  const c=this.context,b=this.buffers.get(cue);
  if(this.disposed||!c||c.state!=='running'||!b||gain<=0)return false;
  if(this.voices.size>=MAX_VOICES)return false;
  try{
   const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=Math.min(1,Math.max(0,gain));s.connect(g);g.connect(c.destination);
   this.voices.set(s,g);s.onended=()=>this.release(s);try{s.start();}catch{this.release(s);return false;}return true;
  }catch{return false;}
 }
 private release(s:AudioBufferSourceNode){const g=this.voices.get(s);if(!g)return;this.voices.delete(s);s.onended=null;try{s.disconnect();g.disconnect();}catch{}}
 stop(){for(const s of this.voices.keys()){try{s.stop();}catch{}this.release(s);}}
 dispose(){this.disposed=true;this.stop();this.buffers.clear();const c=this.context;this.context=null;if(c)void c.close().catch(()=>{});}
}
export class FeedbackController{
 private prefs=DEFAULT_FEEDBACK;
 private port:AudioPort|null=null;
 private unlockJob:Promise<boolean>|null=null;
 private ready=false;private epoch=0;private gameId='';private revision=-1;
 private ended=false;private disposed=false;
 private readonly createPort:()=>AudioPort;
 private readonly vibrate:(ms:number)=>void;
 private readonly reduced:()=>boolean;
 constructor(createPort=()=>new WebAudioPort(),vibrate=(ms:number)=>{if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')navigator.vibrate(ms);},reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches){
  this.createPort=createPort;this.vibrate=vibrate;this.reduced=reduced;
 }
 configure(prefs:FeedbackPrefs){this.prefs=normalizeFeedback(prefs);if(!this.prefs.sound){this.stop();this.ready=false;}}
 unlock(){
  if(this.disposed||!this.prefs.sound)return Promise.resolve(false);
  if(this.unlockJob)return this.unlockJob;
  try{
   this.port??=this.createPort();
   const port=this.port;
   this.unlockJob=Promise.resolve(port.unlock()).then(ok=>{this.ready=ok&&!this.disposed&&this.port===port&&this.prefs.sound;return this.ready;},()=>false).finally(()=>{this.unlockJob=null;});
   return this.unlockJob;
  }catch{return Promise.resolve(false);}
 }
 private emit(cue:Cue){
  if(this.disposed)return;
  if(this.prefs.haptics){try{if(!this.reduced())this.vibrate(cue==='result'?25:cue==='capture'||cue==='check'?18:cue==='invalid'?8:10);}catch{}}
  if(!this.prefs.sound)return;
  const epoch=this.epoch,gain=cue==='result'?this.prefs.resultVolume:this.prefs.volume;
  const play=()=>{if(this.disposed||!this.prefs.sound||this.epoch!==epoch||!this.ready)return;try{this.port?.play(cue,gain);}catch{}};
  if(this.ready)play();
  else if(this.unlockJob)void this.unlockJob.then(ok=>{if(ok)play();});
 }
 begin(id:string,announce:boolean){this.stop();this.gameId=id;this.revision=-1;this.ended=false;if(announce)this.emit('start');}
 commit(events:readonly GameplayEvent[]){
  const m=events.find(e=>e.kind==='MoveCommitted');
  if(!m||m.gameId!==this.gameId||m.revision<=this.revision||this.ended)return;
  this.revision=m.revision;
  const has=(kind:GameplayEvent['kind'])=>events.some(e=>e.kind===kind&&e.gameId===m.gameId&&e.revision===m.revision);
  this.emit(has('Check')?'check':has('Capture')?'capture':has('Promotion')?'promotion':'move');
 }
 finish(event:GameplayEvent){
  if(event.kind!=='MatchEnded'||event.gameId!==this.gameId||event.revision<=this.revision||this.ended)return;
  this.revision=event.revision;this.ended=true;this.emit('result');
 }
 preview(cue:'pick'|'invalid'){if(this.gameId&&!this.ended)this.emit(cue);}
 sample(){this.emit('move');}
 stop(){this.epoch++;try{this.port?.stop();}catch{}}
 dispose(){this.disposed=true;this.stop();try{this.port?.dispose();}catch{}this.port=null;}
}
