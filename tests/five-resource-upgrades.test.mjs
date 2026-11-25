import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {OPENINGS,identifyOpening,openingKey} from '../src/openings.ts';
import {initialMatch,applyMove} from '../server/src/rules.mjs';
import {validatedSelection} from '../server/src/selection.mjs';
test('all thirty opening records are legal and uniquely recognized',()=>{
 assert.equal(OPENINGS.length,30);
 for(const [eco,name,san] of OPENINGS){const game=new Chess();for(const move of san.split(' '))game.move(move);
 assert.deepEqual(identifyOpening(game),{eco,name});}
});
test('opening survives subsequent moves, restores after undo and ignores custom puzzles',()=>{
 const g=new Chess();for(const m of ['e4','c5','Nf3'])g.move(m);
 assert.equal(identifyOpening(g)?.eco,'B20');g.undo();assert.equal(identifyOpening(g)?.eco,'B20');g.undo();assert.equal(identifyOpening(g),null);
 const resumed=new Chess();resumed.loadPgn('1. e4 c5 2. Nf3');assert.equal(identifyOpening(resumed)?.eco,'B20');
 assert.equal(identifyOpening(new Chess('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1')),null);
 assert.equal(openingKey('x w - - 1 2'),openingKey('x w - - 2 5'));
});
test('selection is transient, turn/seat/revision checked and rejects invalid squares',()=>{
 const state={...initialMatch('host',Date.now()+10000),status:'active',guestToken:'guest'};
 const before=JSON.stringify(state);const cmd={type:'selection',revision:0,square:'e2'};
 assert.deepEqual(validatedSelection(state,'w',cmd),{...cmd,side:'w'});
 assert.equal(JSON.stringify(state),before);
 for(const change of [{square:'e7'},{square:'a9'},{square:'e4'},{revision:1}])assert.equal(validatedSelection(state,'w',{...cmd,...change}),null);
 assert.equal(validatedSelection(state,'b',cmd),null);assert.equal(validatedSelection(state,'w',{...cmd,square:null})?.square,null);
 const result=applyMove(state,'w',{type:'move',id:'move12345',revision:0,from:'e2',to:'e4'});assert.equal(result.ok,true);
 assert.equal(validatedSelection(result.next,'w',cmd),null);
 assert.equal(validatedSelection(result.next,'b',{...cmd,revision:1,square:'e7'})?.square,'e7');
});

import {VOXEL_SOURCE,voxelSurface} from '../src/voxel-models.ts';
import {BOARD_VARIANTS,NEW_MODELS} from '../src/chess-cosmetics.ts';
test('all eight source board palettes and four additional FBX families are unique',()=>{
 assert.equal(BOARD_VARIANTS.length,8);assert.equal(new Set(BOARD_VARIANTS.map(v=>v.id)).size,8);
 assert.equal(NEW_MODELS.filter(v=>v.id.startsWith('premium-')).length,4);
 for(const v of BOARD_VARIANTS){assert.notEqual(v.light,v.dark);assert.match(v.border,/^#[a-f0-9]{6}$/);}
});
test('all six bundled source voxel meshes preserve exact source surface area and volume',()=>{
 for(const kind of Object.keys(VOXEL_SOURCE)){
  const mesh=voxelSurface(kind),source=VOXEL_SOURCE[kind];
  assert.equal(mesh.area,source.area);assert.equal(mesh.voxels,source.voxels);
  assert.ok(mesh.triangles>0&&mesh.triangles<1200);
  assert.equal(mesh.positions.length,mesh.normals.length);
  let area=0;
  for(let i=0;i<mesh.positions.length;i+=9){
   const a=mesh.positions.slice(i,i+3),b=mesh.positions.slice(i+3,i+6),c=mesh.positions.slice(i+6,i+9),n=mesh.normals.slice(i,i+3);
   const u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   assert.ok(cross.reduce((s,x,j)=>s+x*n[j],0)>0);area+=Math.hypot(...cross)/2;
  }
  assert.ok(Math.abs(area*100-source.area)<1e-6);
 }
});
