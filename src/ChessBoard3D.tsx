import {useEffect, useRef, useState} from 'react';
import {Chess, type Square} from 'chess.js';
import type * as THREE from 'three';

export type ThreeTheme = 'deco'|'bauhaus'|'scifi'|'egypt'|'classic';
type Props = {fen:string;selected:Square|null;legal:Square[];lastMove:[Square,Square]|null;theme:ThreeTheme;useLibraryAssets:boolean;flipped:boolean;reducedMotion:boolean;onSquare:(square:Square)=>void};
const names:Record<string,string>={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const heights:Record<string,number>={p:.8,n:1.04,b:1.13,r:.94,q:1.29,k:1.4};
const files='abcdefgh';

export default function ChessBoard3D({fen,selected,legal,lastMove,theme,useLibraryAssets,flipped,reducedMotion,onSquare}:Props){
  const mount=useRef<HTMLDivElement>(null);
  const onSquareRef=useRef(onSquare);
  const positionRef=useRef({fen,selected,legal,lastMove});
  const updateRef=useRef<(()=>void)|null>(null);
  const [status,setStatus]=useState('Starting 3D renderer…');
  onSquareRef.current=onSquare;
  positionRef.current={fen,selected,legal,lastMove};
  useEffect(()=>{updateRef.current?.();},[fen,selected,legal,lastMove]);
  useEffect(()=>{
    let alive=true;
    let cleanup=()=>{};
    const init=async()=>{
      const THREE=await import('three');
      if(!alive||!mount.current)return;
      const host=mount.current;
      let renderer:THREE.WebGLRenderer;
      try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});}
      catch{if(alive)setStatus('WebGL unavailable. Switch to 2D.');return;}
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.setClearColor(0x190e15);
      renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:manipulation';
      host.appendChild(renderer.domElement);
      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(44,1,.1,80);
      camera.position.set(flipped?-8.6:8.6,12,flipped?-9:9);
      camera.lookAt(0,0,0);
      scene.add(new THREE.HemisphereLight(0xffefda,0x423142,2.05));
      const key=new THREE.DirectionalLight(0xffd79b,2.2);
      key.position.set(-5,12,5);scene.add(key);
      const board=new THREE.Group(),pieces=new THREE.Group();
      scene.add(board,pieces);
      const cream=new THREE.MeshStandardMaterial({color:0xeed5a9,roughness:.61});
      const wood=new THREE.MeshStandardMaterial({color:0x946044,roughness:.58});
      const selectMat=new THREE.MeshStandardMaterial({color:0x8fb16f});
      const legalMat=new THREE.MeshStandardMaterial({color:0xe3b75d});
      const lastMat=new THREE.MeshStandardMaterial({color:0xc99453});
      const tileGeometry=new THREE.BoxGeometry(1,.12,1);
      const tiles:THREE.Mesh[]=[];
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const tile=new THREE.Mesh(tileGeometry,(r+c)%2?wood:cream);
        tile.position.set(c-3.5,-.08,r-3.5);
        tile.userData.square=(files[c]+(8-r)) as Square;
        board.add(tile);tiles.push(tile);
      }
      const base=new THREE.Mesh(new THREE.BoxGeometry(8.35,.19,8.35),new THREE.MeshStandardMaterial({color:0xb0834b,metalness:.4,roughness:.4}));
      base.position.y=-.24;board.add(base);
      const darkBase=new THREE.Mesh(new THREE.BoxGeometry(8.47,.13,8.47),new THREE.MeshStandardMaterial({color:0x331c24}));
      darkBase.position.y=-.37;board.add(darkBase);
      const ivory=new THREE.MeshStandardMaterial({color:0xf4e3bf,metalness:.35,roughness:.33});
      const obsidian=new THREE.MeshStandardMaterial({color:0x392b39,metalness:.52,roughness:.28});
      const gold=new THREE.MeshStandardMaterial({color:0xd1a358,metalness:.7,roughness:.26});
      const prototypes=new Map<string,THREE.Group>();
      const makeFallback=(kind:string,color:string)=>{
        const root=new THREE.Group();const mat=color==='w'?ivory:obsidian;
        const put=(geometry:THREE.BufferGeometry,y:number,m:THREE.Material=mat)=>{
          const part=new THREE.Mesh(geometry,m);part.position.y=y;root.add(part);return part;
        };
        put(new THREE.CylinderGeometry(.30,.34,.12,14),.07);
        put(new THREE.CylinderGeometry(.13,.23,kind==='p'?.35:.54,14),kind==='p'?.29:.37);
        if(kind==='p')put(new THREE.SphereGeometry(.20,12,8),.64);
        else if(kind==='n'){const head=put(new THREE.ConeGeometry(.26,.62,5),.91);head.rotation.z=-.4;}
        else if(kind==='r'){put(new THREE.CylinderGeometry(.24,.20,.23,8),.80);for(let i=0;i<4;i++){const x=put(new THREE.BoxGeometry(.17,.2,.16),1.02);x.position.x=(i%2?1:-1)*.16;x.position.z=(i>1?1:-1)*.16;}}
        else if(kind==='b'){put(new THREE.SphereGeometry(.22,12,8),.91);put(new THREE.CylinderGeometry(.045,.045,.14,8),1.11,gold);}
        else{put(new THREE.CylinderGeometry(.24,.16,.19,12),.84);put(new THREE.SphereGeometry(.14,12,8),1.02,gold);if(kind==='k'){put(new THREE.BoxGeometry(.09,.29,.08),1.23,gold);put(new THREE.BoxGeometry(.30,.08,.08),1.25,gold);}}
        const bounds=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
        root.scale.setScalar(heights[kind]/Math.max(bounds.y,.1));return root;
      };
      for(const color of ['w','b'])for(const type of Object.keys(names))prototypes.set(color+type,makeFallback(type,color));
      const coord=(square:string)=>new THREE.Vector3(files.indexOf(square[0])-3.5,.02,8-Number(square[1])-3.5);
      const redraw=()=>{
        if(!alive)return;
        const state=positionRef.current;
        const chess=new Chess(state.fen);
        while(pieces.children.length)pieces.remove(pieces.children[0]);
        const ranks=chess.board();
        for(const row of ranks)for(const p of row){
          if(!p)continue;
          const node=new THREE.Group();node.userData.square=p.square;
          node.position.copy(coord(p.square));
          const mesh=prototypes.get(p.color+p.type);
          if(mesh)node.add(mesh.clone(true));
          pieces.add(node);
        }
        for(const t of tiles){
          const sq=t.userData.square as Square;
          const r=8-Number(sq[1]),c=files.indexOf(sq[0]);
          t.material=sq===state.selected?selectMat:state.legal.includes(sq)?legalMat:state.lastMove?.includes(sq)?lastMat:(r+c)%2?wood:cream;
        }
      };
      updateRef.current=redraw;redraw();
      const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
      const click=(event:PointerEvent)=>{
        const rect=renderer.domElement.getBoundingClientRect();
        if(!rect.width||!rect.height)return;
        pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
        ray.setFromCamera(pointer,camera);
        for(const hit of ray.intersectObjects([...pieces.children,...tiles],true)){
          let node:THREE.Object3D|null=hit.object;
          while(node&&!node.userData.square)node=node.parent;
          if(node?.userData.square){onSquareRef.current(node.userData.square as Square);return;}
        }
      };
      renderer.domElement.addEventListener('pointerdown',click);
      const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
      const observer=new ResizeObserver(resize);observer.observe(host);resize();
      let frame=0;
      const animate=()=>{if(!alive)return;if(!document.hidden){if(!reducedMotion)key.intensity=2.2+Math.sin(performance.now()*.0005)*.07;renderer.render(scene,camera);}frame=requestAnimationFrame(animate);};
      animate();
      cleanup=()=>{cancelAnimationFrame(frame);updateRef.current=null;observer.disconnect();renderer.domElement.removeEventListener('pointerdown',click);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
      setStatus('3D board active · procedural chess pieces');
      if(useLibraryAssets){
        try{
          const response=await fetch('/assets/asset-manifest.json');
          if(!response.ok)throw Error('asset manifest missing');
          const parsed:{files:Array<{output:string}>}=await response.json();
          const listed=new Set(parsed.files.map(v=>v.output));
          const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
          const {FBXLoader}=await import('three/addons/loaders/FBXLoader.js');
          const gltfLoader=new GLTFLoader(),fbxLoader=new FBXLoader();
          let loaded=0;
          for(const color of ['w','b'])for(const type of Object.keys(names)){
            if(!alive)break;
            const n=names[type];
            const path=theme==='classic'?'chessset/models/SM_'+(color==='w'?'White':'Black')+(n==='bishop'?'bishop':n[0].toUpperCase()+n.slice(1))+'.fbx':'models/'+theme+'/'+n+'_'+(color==='w'?'light':'dark')+'.glb';
            if(!listed.has(path))continue;
            try{
              const object=theme==='classic'?await fbxLoader.loadAsync('/assets/'+path):(await gltfLoader.loadAsync('/assets/'+path)).scene;
              if(!alive)return;
              const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
              if(bounds.isEmpty())continue;
              const scale=Math.min(heights[type]/Math.max(size.y,.001),.85/Math.max(size.x,size.z,.001));
              object.scale.multiplyScalar(scale);object.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
              if(theme==='classic'){
                // FBX materials may not embed texture paths. Users may prepare PBR WebP separately.
                object.traverse(item=>{if(item instanceof THREE.Mesh)item.material=new THREE.MeshStandardMaterial({color:color==='w'?0xf2e4d1:0x3f3039,metalness:.35,roughness:.42});});
              }
              prototypes.set(color+type,object);loaded++;redraw();setStatus('Library 3D models: '+loaded+'/12 loaded · '+theme);
            }catch{ /* A damaged optional model never blocks chess gameplay. */ }
          }
          if(alive)setStatus('Library '+theme+': '+loaded+'/12 models; missing models use fallback');
        }catch{if(alive)setStatus('Asset library not installed. Procedural 3D mode remains available.');}
      }
    };
    init().catch(()=>{if(alive)setStatus('3D initialization failed. Switch to 2D board.');});
    return()=>{alive=false;cleanup();};
  },[theme,useLibraryAssets,flipped,reducedMotion]);
  return <div className="board3d" role="group" aria-label="Interactive 3D chess board"><div className="board3d-canvas" ref={mount}/><span className="board3d-status" role="status">{status}</span></div>;
}
