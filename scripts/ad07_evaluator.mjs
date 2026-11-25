// Read-only evaluator for the observed AD-06 schema. Does not dispatch source events.
const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
const clamp=(t,lo,hi)=>Math.min(hi,Math.max(lo,t));
export function cubic(co,dt){check(co.length===4&&co.every(finite)&&finite(dt),'invalid coefficients');return ((co[0]*dt+co[1])*dt+co[2])*dt+co[3]}
export function compileClip(c){
  check(c.schema_version===1&&finite(c.start)&&finite(c.stop)&&c.start<=c.stop,'invalid clip');
  check(c.dense.m_CurveCount===0&&c.dense.m_SampleArray.length===0,'dense evaluator not implemented');
  const tracks=c.stream.track_index.map((indices,i)=>{
    const records=indices.map(({frame,key})=>{const f=c.stream.frames[frame],k=f.keys[key];check(k.index===i&&k.coefficients.length===4&&k.coefficients.every(finite),'invalid stream key');return {kind:f.kind,time:f.time,co:k.coefficients}});
    check(records.length&&records[0].kind==='boundary_min'&&records.slice(1).every(k=>k.kind==='time'&&finite(k.time)),'unsupported boundary profile');
    const timed=records.slice(1);check(timed.length&&timed.every((k,j)=>j===0||k.time>timed[j-1].time),'invalid key order');
    return {initial:records[0].co[3],timed};
  });
  check(tracks.length===c.stream.curve_count&&c.constant.every(finite),'invalid channel storage');
  const bindings=[];let index=0;
  for(const b of c.bindings.genericBindings){
    check(!b.isPPtrCurve&&!b.isIntCurve&&!b.isSerializeReferenceCurve,'unsupported binding kind');
    const width=b.typeID===4?({1:3,2:4,3:3,4:3}[b.attribute]):1;check(width,'unsupported transform');bindings.push({index,width,binding:b});index+=width;
  }
  check(index===tracks.length+c.constant.length,'channel coverage');
  const direct=[];
  for(const [kind,curves] of Object.entries(c.direct_curves))for(const q of curves){
    check(kind==='m_ScaleCurves'||kind==='m_FloatCurves','unsupported direct curve');
    check(q.curve.m_PreInfinity===2&&q.curve.m_PostInfinity===2,'unsupported infinity mode');
    const keys=q.curve['#299'];check(keys.length&&keys.every((k,i)=>k.weightedMode===0&&finite(k.time)&&(i===0||k.time>keys[i-1].time)),'unsupported direct tangent mode or times');direct.push({kind,path:q.path,attribute:q.attribute??'m_LocalScale',keys});
  }
  check(c.events.every(e=>finite(e.time)&&e.time>=c.start&&e.time<=c.stop),'invalid event time');
  return {start:c.start,stop:c.stop,loop:c.loop,tracks,constants:c.constant.slice(),bindings,direct,events:c.events.map((e,i)=>({index:i,event:e}))};
}
function sampleTrack(track,t){
  const a=track.timed;if(t<a[0].time)return track.initial;
  let lo=0,hi=a.length;while(lo+1<hi){const mid=(lo+hi)>>1;if(a[mid].time<=t)lo=mid;else hi=mid;}
  const k=a[lo];return lo===a.length-1||t===k.time?k.co[3]:cubic(k.co,t-k.time);
}
function hermite(a,b,t,axis){
  const get=(k,n)=>axis?k[n][axis]:k[n];const p=get(a,'value'),q=get(b,'value'),m=get(a,'outSlope'),n=get(b,'inSlope');
  check([p,q,m,n].every(finite),'unsupported direct slope');const dt=b.time-a.time,u=(t-a.time)/dt,u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*p+(u3-2*u2+u)*dt*m+(-2*u3+3*u2)*q+(u3-u2)*dt*n;
}
function directValue(q,t){
  const a=q.keys;if(t<=a[0].time)return a[0].value;if(t>=a.at(-1).time)return a.at(-1).value;
  const i=a.findIndex(k=>k.time>t),p=a[i-1],n=a[i];if(t===p.time)return p.value;return typeof p.value==='number'?hermite(p,n,t):Object.fromEntries(Object.keys(p.value).map(axis=>[axis,hermite(p,n,t,axis)]));
}
export function sampleClip(c,t){
  check(finite(t),'invalid sample time');t=clamp(t,c.start,c.stop);
  const channels=[...c.tracks.map(k=>sampleTrack(k,t)),...c.constants];check(channels.every(finite),'nonfinite sample');
  return {time:t,channels,bindings:c.bindings.map(b=>({...b,values:channels.slice(b.index,b.index+b.width)})),direct:c.direct.map(q=>({kind:q.kind,path:q.path,attribute:q.attribute,value:directValue(q,t)}))};
}
// Forward intervals (previous,current]; optional inclusive start once, no implicit event dispatch/loop wrap.
export function eventsBetween(c,previous,current,{includeStart=false}={}){
  check(finite(previous)&&finite(current)&&previous<=current&&previous>=c.start&&current<=c.stop,'invalid event interval');
  return c.events.filter(({event:e})=>(e.time>previous||(includeStart&&previous===c.start&&e.time===previous))&&e.time<=current).sort((a,b)=>a.event.time-b.event.time||a.index-b.index);
}
