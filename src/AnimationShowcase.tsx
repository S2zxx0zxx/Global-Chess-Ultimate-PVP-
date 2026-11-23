import {useEffect,useRef,useState} from 'react';
import type * as THREE from 'three';

const FAVORITES=['Idle_No_Loop','Yes','Sword_Block','Sword_Regular_A','Sword_Dash','Hit_Knockback','NinjaJump_Land'];
export default function AnimationShowcase(){
  const mount=useRef<HTMLDivElement>(null);
  const mixerRef=useRef<THREE.AnimationMixer|null>(null);
  const clipsRef=useRef<THREE.AnimationClip[]>([]);
  const [status,setStatus]=useState('Loading optional animation library…');
  const [names,setNames]=useState<string[]>([]);
  const [selected,setSelected]=useState('Idle_No_Loop');
  useEffect(()=>{
    const mixer=mixerRef.current;
    if(!mixer)return;
    const clip=clipsRef.current.find(c=>c.name===selected);
    if(!clip)return;
    mixer.stopAllAction();
    const action=mixer.clipAction(clip);action.reset().fadeIn(.15).play();
  },[selected,names]);
  useEffect(()=>{
    let alive=true,cleanup=()=>{};
    const init=async()=>{
      const THREE=await import('three');
      const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
      if(!alive||!mount.current)return;
      const host=mount.current;
      const catalog=await fetch('/assets/asset-manifest.json');
      if(!catalog.ok)throw Error('Install optimized animation asset pack to enable this viewer');
      const files:{files:Array<{output:string}>}=await catalog.json();
      if(!files.files.some(f=>f.output==='humanoid/UAL2_Standard.glb'))throw Error('Missing UAL2_Standard.glb animation library');
      const renderer=new THREE.WebGLRenderer({antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.setClearColor(0x21121d);
      renderer.domElement.style.cssText='display:block;width:100%;height:100%';
      host.appendChild(renderer.domElement);
      const scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffe3ad,0x332137,2.2));
      const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(3,7,5);scene.add(key);
      const camera=new THREE.PerspectiveCamera(40,1,.1,100);
      camera.position.set(3.6,2.8,5.2);camera.lookAt(0,1,0);
      const gltf=await new GLTFLoader().loadAsync('/assets/humanoid/UAL2_Standard.glb');
      if(!alive){renderer.dispose();renderer.domElement.remove();return;}
      const subject=gltf.scene;
      const bounds=new THREE.Box3().setFromObject(subject);
      const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      if(!bounds.isEmpty()){
        const ratio=2.7/Math.max(.01,size.y);
        subject.scale.multiplyScalar(ratio);
        subject.position.set(-center.x*ratio,-bounds.min.y*ratio,-center.z*ratio);
      }
      scene.add(subject);
      const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.65,.22,40),new THREE.MeshStandardMaterial({color:0x9d7348,metalness:.48,roughness:.46}));
      platform.position.y=-.13;scene.add(platform);
      const mixer=new THREE.AnimationMixer(subject);
      mixerRef.current=mixer;
      clipsRef.current=gltf.animations;
      const all=gltf.animations.map(x=>x.name);
      setNames(all);
      setStatus(all.length+' original humanoid animation clips available');
      const action=gltf.animations.find(x=>x.name==='Idle_No_Loop')||gltf.animations[0];
      if(action)mixer.clipAction(action).play();
      const clock=new THREE.Clock();
      const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
      const observer=new ResizeObserver(resize);observer.observe(host);resize();
      let id=0;
      const frame=()=>{if(!alive)return;const dt=Math.min(clock.getDelta(),.075);if(!document.hidden){mixer.update(dt);renderer.render(scene,camera);}id=requestAnimationFrame(frame);};
      frame();
      cleanup=()=>{cancelAnimationFrame(id);observer.disconnect();mixer.stopAllAction();mixerRef.current=null;renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
    };
    init().catch(e=>{if(alive)setStatus(e instanceof Error?e.message:'Animation viewer unavailable');});
    return()=>{alive=false;cleanup();};
  },[]);
  return <section className="animation-viewer">
    <div className="animation-stage" ref={mount} aria-label="3D animated mannequin preview"/>
    <p role="status">{status}</p>
    {names.length>0&&<><label htmlFor="animation-clip">Animation</label><select id="animation-clip" value={selected} onChange={e=>setSelected(e.target.value)}>
      {names.filter(n=>FAVORITES.includes(n)).map(n=><option key={n} value={n}>{n}</option>)}
      {names.filter(n=>!FAVORITES.includes(n)).map(n=><option key={n} value={n}>{n}</option>)}
    </select></>}
    <small>The 43 clips animate a humanoid rig; they do not change legal chess moves or automatically rig chess pieces.</small>
  </section>;
}
