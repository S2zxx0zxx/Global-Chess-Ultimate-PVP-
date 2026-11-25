// Derived from original Kytric Voxel Board Games CC0 glTF geometry.
// Exact voxel boundary checked against every source triangle surface at 0.1-unit resolution.
// All four original colors share position/normal/index buffers; palette colors retained.
// Compact disjoint cuboids encode the volume; greedy surface meshing emits only exterior faces.
export const VOXEL_SOURCE = {
 p:{boxes:'101F3F232E5E353D8D262E7326337ED63E7E36DD7E484CAC5A5BRB4F4CQ54F55QCBF5CQC5FBBQC3G3DI43G44IDCG4DID4GCCID3J3DP43J44PDCJ4DPD4JCCPD',voxels:2556,area:1696,sha:'7d88b979c7c7f7fb61a5f9226e848a0407b30571fa717504794727102ef1a584'},
 r:{boxes:'000G3G131F5F252E9E161F7216227FE62F7F26EE7F393DSD2I2EJ32I33JEDI3EJE3IDDJE2K2EV32K33VEDK3EVE3KDDVE1L1FN21L22NFEL2FNF2LEENF1O1FV21O22VFEO2FVF2OEEVF3S3DV43S44VDCS4DVD4SCCVD1V14Y46V1AY4CV1FY41V64YACV6FYA1VC4YF6VCAYFCVCFYF',voxels:5044,area:2960,sha:'04e14128ce3834702df6a852ad771c4e68010804fa62013a40ed4b77c85d5050'},
 n:{boxes:'000G3G131F5F252E8E161F7216227FE62F7F26EE7F383DED2A2ED32A33DEDA3EDE3ADDDE5E4BMC5F3BJ44F55LBBF5CLB5FCBZD4G45I5BG4CI54GB5YCBGBCYC5JDBXE4KC5WDBKCCWD4L65NBBL6CNB5M5BOB5MEBVF4N75PBBN7CPB5NBBaC4ND5UEBNDCUE5O6BQB4P85WBBP8CWB5Q7BXB5S1BW74T25V8BT2CV84V75W8BV7CW85W6BX75XABaB',voxels:3842,area:2380,sha:'f74d3db9f0161e83384735efd368f419f249a3fef46b073c90260f2040b34fe1'},
 b:{boxes:'000G3G131F5F252E8E161F7216227FE62F7F26EE7F383DAD4A4CCC5C5BTB4K4CO54K55OCBK5COC5KBBOC3L3DN43L44NDCL4DND4LCCND4Q4CX54Q55TCBQ5CTC5QBBTC4T5CX84V8CXC5X5BZB6Z6AaA7a79c9',voxels:3140,area:2136,sha:'c1fc0736a895c29009b9f5fbf5d00c7e3434cd3ac13b00a179e75e1647fe0f97'},
 q:{boxes:'000G3G131F5F252E7E373DAD282E9328339ED83E9E38DD9E4A4CCC5C5BeB3O3DS53O55SDBO5DSD5OBBSD2P2ER32P33REDP3ERE3PDDRE4T4Cf54T55fCBT5CfC5TBBfC3X3De43X44eDCX4DeD4XCCeD2a2Ee32a33eEDa3EeE3aDDeE1b13f25b17f29b1Bf2Db1Ff21b22f3Eb2Ff31b52f7Eb5Ff71b92fBEb9FfB1bD2fFEbDFfF2bE3fF5bE7fF9bEBfFDbEEfF2e23f35e27f39e2Bf3De2Ef32e53f7De5Ef76e6AfA2e93fBDe9EfB2eD3fE5eD7fE9eDBfEDeDEfE7f79g9',voxels:4188,area:2880,sha:'5988aff2fbeb54b23ced97ec2c497252dd19a0ef40f2e82dfb2bc31b28556dd2'},
 k:{boxes:'000G3G131F5F252E7E373DAD282E9328339ED83E9E38DD9E4A4CCC5C5BgB3P3DT53P55TDBP5DTD5PBBTD2Q2ES32Q33SEDQ3ESE3QDDSE4U4Cg54U55gCBU5CgC5UBBgC3Y3Df43Y44fDCY4DfD4YCCfD2b2Ef32b33fEDb3EfE3bDDfE1c1Fe21c22eFEc2FeF2cEEeF7g79m95i77k99i7Bk9',voxels:4252,area:2808,sha:'aeed57ecbde3add1831060c55d7b79a7556e21d0d186716fe9e51e8b2816bbf6'}
} as const;
export type VoxelKind=keyof typeof VOXEL_SOURCE;
const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const key=(p:number[])=>p.join(',');
export function voxelSurface(kind:VoxelKind){
 const source=VOXEL_SOURCE[kind],cells=new Set<string>(),pts:number[][]=[];
 for(let i=0;i<source.boxes.length;i+=6){
  const [x,y,z,X,Y,Z]=Array.from(source.boxes.slice(i,i+6),c=>alphabet.indexOf(c));
  if(!(x<X&&y<Y&&z<Z))throw Error('Invalid source cuboid');
  for(let a=x;a<X;a++)for(let b=y;b<Y;b++)for(let c=z;c<Z;c++){
   const p=[a,b,c],k=key(p);if(cells.has(k))throw Error('Overlapping source cuboids');cells.add(k);pts.push(p);
  }
 }
 const planes=new Map<string,Set<number>>();let area=0;
 for(const p of pts)for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const neighbor=[...p];neighbor[axis]+=sign;if(cells.has(key(neighbor)))continue;
  const u=(axis+1)%3,v=(axis+2)%3,k=[axis,sign,p[axis]+(sign===1?1:0)].join(',');
  if(!planes.has(k))planes.set(k,new Set());planes.get(k)!.add(p[u]*64+p[v]);area++;
 }
 if(cells.size!==source.voxels||area!==source.area)throw Error('Source geometry integrity mismatch');
 const positions:number[]=[],normals:number[]=[];
 for(const [id,mask] of planes){
  const [axis,sign,plane]=id.split(',').map(Number),u=(axis+1)%3,v=(axis+2)%3;
  while(mask.size){
   const cell=Math.min(...mask),a=Math.floor(cell/64),b=cell%64;let A=a+1,B=b+1;
   while(mask.has(A*64+b))A++;
   while(Array.from({length:A-a},(_,j)=>mask.has((a+j)*64+B)).every(Boolean))B++;
   for(let i=a;i<A;i++)for(let j=b;j<B;j++)mask.delete(i*64+j);
   const corners=[[a,b],[A,b],[A,B],[a,B]].map(([x,y])=>{const p=[0,0,0];p[axis]=plane;p[u]=x;p[v]=y;return [(p[0]-8)/10,p[1]/10,(p[2]-8)/10];});
   for(const i of sign===1?[0,1,2,0,2,3]:[0,2,1,0,3,2]){positions.push(...corners[i]);const n=[0,0,0];n[axis]=sign;normals.push(...n);}
  }
 }
 return {positions,normals,area,voxels:cells.size,triangles:positions.length/9};
}
