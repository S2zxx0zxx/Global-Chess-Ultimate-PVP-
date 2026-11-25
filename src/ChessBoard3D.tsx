import {useEffect, useRef, useState} from 'react';
import {Chess, type Square} from 'chess.js';
import type * as THREE from 'three';
import type {MoveCommitted} from './gameplay-events';

import { boardVariant, isPremium, isVoxel, type BoardSkin, type ThreeTheme } from './chess-cosmetics';
import { voxelSurface, type VoxelKind } from './voxel-models';
export type {ThreeTheme} from './chess-cosmetics';
type Props = {fen:string;selected:Square|null;legal:Square[];lastMove:[Square,Square]|null;motion?:MoveCommitted;theme:ThreeTheme;boardSkin:BoardSkin;useLibraryAssets:boolean;flipped:boolean;reducedMotion:boolean;onSquare:(square:Square)=>void};
const names:Record<string,string>={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const heights:Record<string,number>={p:.8,n:1.04,b:1.13,r:.94,q:1.29,k:1.4};
const files='abcdefgh';

export default function ChessBoard3D({fen,selected,legal,lastMove,motion,theme,boardSkin,useLibraryAssets,flipped,reducedMotion,onSquare}:Props){
  const mount=useRef<HTMLDivElement>(null);
  const onSquareRef=useRef(onSquare);
  const positionRef=useRef({fen,selected,legal,lastMove,motion});
  const updateRef=useRef<(()=>void)|null>(null);
  const [status,setStatus]=useState('Starting 3D renderer…');
  onSquareRef.current=onSquare;
  positionRef.current={fen,selected,legal,lastMove,motion};
  useEffect(()=>{updateRef.current?.();},[fen,selected,legal,lastMove,motion]);
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
      const variant=boardVariant(boardSkin);
      const camera=new THREE.PerspectiveCamera(variant?52:44,1,.1,80);
      camera.position.set(flipped?-8.6:8.6,12,flipped?-9:9);
      camera.lookAt(0,0,0);
      scene.add(new THREE.HemisphereLight(0xffefda,0x423142,2.05));
      const key=new THREE.DirectionalLight(0xffd79b,2.2);
      key.position.set(-5,12,5);scene.add(key);
      const board=new THREE.Group(),pieces=new THREE.Group();
      scene.add(board,pieces);
      const cream=new THREE.MeshStandardMaterial({color:variant?.light??0xeed5a9,roughness:.61});
      const wood=new THREE.MeshStandardMaterial({color:variant?.dark??0x946044,roughness:.58});
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
      if(variant){
        // Source board width 25.6, playable field 19.2, trim 19.4, thickness .6.
        // Align the playable 8x8 field to the canonical square coordinates.
        const base=new THREE.Mesh(new THREE.BoxGeometry(25.6/2.4,.25,25.6/2.4),new THREE.MeshStandardMaterial({color:variant.border,roughness:.8}));
        base.position.set(0,-.16,-.3/2.4);board.add(base);
        const trim=new THREE.Mesh(new THREE.BoxGeometry(19.4/2.4,.025,19.4/2.4),new THREE.MeshStandardMaterial({color:variant.trim,roughness:.8}));
        trim.position.y=-.035;board.add(trim);
      }else{
        const base=new THREE.Mesh(new THREE.BoxGeometry(8.35,.19,8.35),new THREE.MeshStandardMaterial({color:0xb0834b,metalness:.4,roughness:.4}));
        base.position.y=-.24;board.add(base);
        const darkBase=new THREE.Mesh(new THREE.BoxGeometry(8.47,.13,8.47),new THREE.MeshStandardMaterial({color:0x331c24}));
        darkBase.position.y=-.37;board.add(darkBase);
      }
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
      const ownResources=new Set<THREE.Object3D>();
      const normalize=(object:THREE.Object3D,kind:string)=>{
        const root=new THREE.Group();root.add(object);root.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
        if(bounds.isEmpty()||![size.x,size.y,size.z].every(Number.isFinite)||size.y<=0)throw Error('Invalid model bounds');
        const scale=Math.min(heights[kind]/Math.max(size.y,.001),.85/Math.max(size.x,size.z,.001));
        root.scale.setScalar(scale);root.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);return root;
      };
      const voxelMats={w:new THREE.MeshStandardMaterial({color:theme==='voxel-wood'?0xd7b991:0xcfcbc8,roughness:.85}),b:new THREE.MeshStandardMaterial({color:theme==='voxel-wood'?0x4e2e1f:0x313335,roughness:.85})};
      for(const type of Object.keys(names)){
        let geometry:THREE.BufferGeometry|undefined;
        try{const data=voxelSurface(type as VoxelKind);geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));}catch{}
        for(const color of ['w','b'] as const){
          let model:THREE.Group;
          try{
            if(!geometry)throw Error('Voxel unavailable');
            const mesh=new THREE.Mesh(geometry,voxelMats[color]);if(color==='b')mesh.rotation.y=Math.PI;
            model=normalize(mesh,type);
          }catch{model=makeFallback(type,color);}
          prototypes.set(color+type,model);ownResources.add(model);
        }
      }
      const disposeTree=(objects:Iterable<THREE.Object3D>)=>{
        const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
        for(const object of objects)object.traverse(node=>{if(node instanceof THREE.Mesh){
          geometries.add(node.geometry);
          for(const material of Array.isArray(node.material)?node.material:[node.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}
        }});
        for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();
      };
      const coord=(square:string)=>new THREE.Vector3(files.indexOf(square[0])-3.5,.02,8-Number(square[1])-3.5);
      let previousFen=positionRef.current.fen;
      let slides:{node:THREE.Group;from:THREE.Vector3;to:THREE.Vector3;started:number}[]=[];let renderedFen='';let lastEvent='';
      const redraw=(force=false)=>{
        if(!alive)return;
        const state=positionRef.current;
        const chess=new Chess(state.fen);
        if(force||renderedFen!==state.fen){slides=[];
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
        const event=state.motion;
        if(!reducedMotion&&event&&event.eventId!==lastEvent&&event.before===previousFen&&event.after===state.fen){
          for(const move of [event,...(event.rook?[event.rook]:[])]){
            const moving=pieces.children.find(child=>child.userData.square===move.to);
            if(moving instanceof THREE.Group){const from=coord(move.from),to=coord(move.to);moving.position.copy(from);slides.push({node:moving,from,to,started:performance.now()});}
          }
        }
        if(event)lastEvent=event.eventId;
        previousFen=state.fen;renderedFen=state.fen;
        }
        for(const t of tiles){
          const sq=t.userData.square as Square;
          const r=8-Number(sq[1]),c=files.indexOf(sq[0]);
          t.material=sq===state.selected?selectMat:state.legal.includes(sq)?legalMat:state.lastMove?.includes(sq)?lastMat:(r+c)%2?wood:cream;
        }
      };
      updateRef.current=()=>redraw();redraw();
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
      const animate=()=>{
        if(!alive)return;
        if(!document.hidden){
          for(const slide of slides){
            const now=performance.now();
            const t=Math.min(1,(now-slide.started)/320);
            const eased=t*t*(3-2*t);
            slide.node.position.lerpVectors(slide.from,slide.to,eased);
            slide.node.position.y+=Math.sin(t*Math.PI)*.18;
            // Restore the exact ground height next frame; never accumulate y-offset.
            if(t>=1)slide.node.position.copy(slide.to);
          }
          slides=slides.filter(s=>performance.now()-s.started<320);
          if(!reducedMotion)key.intensity=2.2+Math.sin(performance.now()*.0005)*.07;
          renderer.render(scene,camera);
        }
        frame=requestAnimationFrame(animate);
      };
      animate();
      cleanup=()=>{cancelAnimationFrame(frame);updateRef.current=null;observer.disconnect();renderer.domElement.removeEventListener('pointerdown',click);disposeTree([scene,...ownResources]);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
      setStatus('3D board active · bundled Kytric low-poly pieces');
      if(isVoxel(theme))return;
      if(isPremium(theme)){
        try{
          const {FBXLoader}=await import('three/addons/loaders/FBXLoader.js');
          const asset=await new FBXLoader().loadAsync('/assets/five-resource/'+theme+'.fbx');
          if(!alive){disposeTree([asset]);return;}
          ownResources.add(asset);asset.updateMatrixWorld(true);
          const candidates:THREE.Mesh[]=[];
          asset.traverse(node=>{if(node instanceof THREE.Mesh&&/^(low|high)poly(white|black)(pawn|rook|knight|bishop|queen|king)/i.test(node.name.replace(/[^a-z]/gi,'')))candidates.push(node);});
          const prepared=new Map<string,THREE.Group>();
          for(const color of ['w','b'])for(const type of Object.keys(names)){
            const prefix=(theme.includes('high')?'high':'low')+'poly'+(color==='w'?'white':'black')+names[type];
            const source=candidates.find(node=>node.name.toLowerCase().replace(/[^a-z]/g,'').startsWith(prefix));
            if(!source)throw Error('Missing premium piece '+prefix);
            // FBX parent/child hierarchy contains halos/horns/antlers; preserve them.
            const clone=source.clone(true);source.matrixWorld.decompose(clone.position,clone.quaternion,clone.scale);
            const model=normalize(clone,type);prepared.set(color+type,model);ownResources.add(model);
          }
          if(prepared.size!==12)throw Error('Incomplete premium set');
          for(const [key,model] of prepared)prototypes.set(key,model);
          redraw(true);setStatus('Original FBX · '+theme+' · 12 piece prototypes loaded');
        }catch{if(alive)setStatus('Optional premium FBX pack unavailable or invalid · bundled low-poly pieces active');}
        return;
      }
      if(useLibraryAssets){
        try{
          const response=await fetch('/assets/asset-manifest.json');
          if(!response.ok)throw Error('asset manifest missing');
          const parsed:{files:Array<{output:string}>}=await response.json();
          const listed=new Set(parsed.files.map(v=>v.output));
          const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
          const {FBXLoader}=await import('three/addons/loaders/FBXLoader.js');
          const gltfLoader=new GLTFLoader(),fbxLoader=new FBXLoader();
          const classicMaterials=new Map<string,THREE.MeshStandardMaterial>();
          if(theme==='classic'){
            const textureLoader=new THREE.TextureLoader();
            for(const color of ['w','b']){
              const prefix='chessset/textures/'+(color==='w'?'WhitePieces':'BlackPieces')+'/Mat_ChessPieces_';
              const maps=new Map<string,THREE.Texture>();
              for(const channel of ['BaseColor','Normal','Roughness','Metallic']){
                const file=prefix+channel+'.webp';
                if(!listed.has(file))continue;
                try{
                  const tex=await textureLoader.loadAsync('/assets/'+file);
                  if(channel==='BaseColor')tex.colorSpace=THREE.SRGBColorSpace;
                  maps.set(channel,tex);
                }catch{ /* Keep gameplay usable even without optional textures. */ }
              }
              classicMaterials.set(color,new THREE.MeshStandardMaterial({
                color: maps.has('BaseColor')?0xffffff:color==='w'?0xf2e4d1:0x3f3039,
                map:maps.get('BaseColor'),normalMap:maps.get('Normal'),
                roughnessMap:maps.get('Roughness'),metalnessMap:maps.get('Metallic'),
                metalness:.35,roughness:.42
              }));
            }
          }
          let loaded=0;
          for(const color of ['w','b'])for(const type of Object.keys(names)){
            if(!alive)break;
            const n=names[type];
            const path=theme==='classic'?'chessset/models/SM_'+(color==='w'?'White':'Black')+(n==='bishop'?'bishop':n[0].toUpperCase()+n.slice(1))+'.fbx':'models/'+theme+'/'+n+'_'+(color==='w'?'light':'dark')+'.glb';
            if(!listed.has(path))continue;
            try{
              const object=theme==='classic'?await fbxLoader.loadAsync('/assets/'+path):(await gltfLoader.loadAsync('/assets/'+path)).scene;
              if(!alive){disposeTree([object]);return;}
              ownResources.add(object);
              const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
              if(bounds.isEmpty())continue;
              const scale=Math.min(heights[type]/Math.max(size.y,.001),.85/Math.max(size.x,size.z,.001));
              object.scale.multiplyScalar(scale);object.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
              if(theme==='classic'){
                // FBX materials may not embed texture paths. Users may prepare PBR WebP separately.
                object.traverse(item=>{if(item instanceof THREE.Mesh)item.material=classicMaterials.get(color)||ivory;});
              }
              prototypes.set(color+type,object);loaded++;redraw(true);setStatus('Library 3D models: '+loaded+'/12 loaded · '+theme);
            }catch{ /* A damaged optional model never blocks chess gameplay. */ }
          }
          if(alive)setStatus('Library '+theme+': '+loaded+'/12 models; missing models use fallback');
        }catch{if(alive)setStatus('Asset library not installed. Bundled low-poly mode remains available.');}
      }
    };
    init().catch(()=>{if(alive)setStatus('3D initialization failed. Switch to 2D board.');});
    return()=>{alive=false;cleanup();};
  },[theme,boardSkin,useLibraryAssets,flipped,reducedMotion]);
  return <div className="board3d" role="group" aria-label="Interactive 3D chess board"><div className="board3d-canvas" ref={mount}/><span className="board3d-status" role="status">{status}</span></div>;
}
