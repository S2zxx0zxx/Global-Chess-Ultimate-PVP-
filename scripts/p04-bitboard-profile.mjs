import {Chess} from 'chess.js';
import assert from 'node:assert/strict';
const DIR=[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
const bits=Array.from({length:64},(_,i)=>1n<<BigInt(i));
// Identical geometric ray primitive, NOT a complete legal generator.
function arrayRay(board,s,dirs){let out=0n;for(const [dr,dc] of dirs){for(let r=(s>>3)+dr,c=(s%8)+dc;r>=0&&r<8&&c>=0&&c<8;r+=dr,c+=dc){let j=r*8+c;out|=bits[j];if(board[j])break;}}return out;}
function bigRay(occ,s,dirs){let out=0n;for(const [dr,dc] of dirs){for(let r=(s>>3)+dr,c=(s%8)+dc;r>=0&&r<8&&c>=0&&c<8;r+=dr,c+=dc){let b=bits[r*8+c];out|=b;if(occ&b)break;}}return out;}
export function profileBitboards(){
 const positions=[new Chess(),new Chess('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'),new Chess('4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1')];
 const boards=positions.map(g=>g.board().flat());const occ=boards.map(b=>b.reduce((n,p,i)=>p?n|bits[i]:n,0n));
 for(let i=0;i<boards.length;i++)for(let s=0;s<64;s++)for(const d of [DIR.slice(0,4),DIR.slice(4)])assert.equal(arrayRay(boards[i],s,d),bigRay(occ[i],s,d));
 function measure(fn){let checksum=0n;const start=performance.now();for(let round=0;round<300;round++)for(let i=0;i<boards.length;i++)for(let s=0;s<64;s++)checksum^=fn(i,s);return {calls:300*boards.length*64,ms:performance.now()-start,checksum:String(checksum)};}
 const array=measure((i,s)=>arrayRay(boards[i],s,DIR)),bigint=measure((i,s)=>bigRay(occ[i],s,DIR));assert.equal(array.checksum,bigint.checksum);
 const at=performance.now();let legalMoves=0;for(let k=0;k<100;k++)for(const g of positions)legalMoves+=g.moves().length;
 return {rayParityCases:384,array,bigint,canonical:{calls:300,legalMoves,ms:performance.now()-at},magicTableBytes:2*64*4096*8,decision:'retain chess.js; ray microbenchmark not end-to-end legal generation, no verified WASM candidate'};
}
