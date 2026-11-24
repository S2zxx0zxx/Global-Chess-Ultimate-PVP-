import type { Chess } from 'chess.js';

type Board=ReturnType<Chess['board']>;
type Piece=NonNullable<Board[number][number]>;
type Side='w'|'b';
const VALUES={p:100,n:320,b:330,r:500,q:900,k:0} as const;
const PHASE={p:0,n:1,b:1,r:2,q:4,k:0} as const;
export type Evaluation={material:number;position:number;mobility:number;pawns:number;kingSafety:number;phase:number;total:number};
const sign=(s:Side)=>s==='w'?1:-1;
const center=(r:number,c:number)=>7-(Math.abs(2*r-7)+Math.abs(2*c-7))/2;
const dirs={n:[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],b:[[-1,-1],[-1,1],[1,-1],[1,1]],r:[[-1,0],[1,0],[0,-1],[0,1]]};
const inside=(r:number,c:number)=>r>=0&&r<8&&c>=0&&c<8;
export function materialCp(board:Board):number {
  return board.flat().reduce((n,p)=>n+(p?sign(p.color)*VALUES[p.type]:0),0);
}
// Original integer formulas, mirrored by relative rank; no publisher lookup tables.
function positional(p:Piece,r:number,c:number,phase:number):number {
  const advance=p.color==='w'?6-r:r-1, ctr=center(r,c);
  switch(p.type){
    case 'p':return 5*advance+2*ctr;
    case 'n':return 6*ctr-12;
    case 'b':return 3*ctr;
    case 'r':return advance===5?12:0;
    case 'q':return 2*ctr;
    case 'k':{
      const opening=-3*ctr+(advance<=-1&&(c===2||c===6)?12:0);
      const endgame=6*ctr;
      return Math.trunc((opening*phase+endgame*(24-phase))/24);
    }
  }
}
// Pseudo-mobility is geometric reach, not legal-move generation or a second material score.
function mobility(board:Board,p:Piece,r:number,c:number):number {
  if(p.type==='p'||p.type==='k')return 0;
  const offsets=p.type==='q'?[...dirs.b,...dirs.r]:dirs[p.type];
  let count=0;
  for(const [dr,dc] of offsets){
    for(let rr=r+dr,cc=c+dc;inside(rr,cc);rr+=dr,cc+=dc){
      const at=board[rr][cc];
      if(at?.color===p.color)break;
      count++;
      if(at||p.type==='n')break;
    }
  }
  return count;
}
function pawnTerms(board:Board,side:Side):number {
  const files=Array<number>(8).fill(0);
  for(const row of board)for(let c=0;c<8;c++)if(row[c]?.color===side&&row[c]?.type==='p')files[c]++;
  let score=0;
  for(let c=0;c<8;c++){
    if(files[c]>1)score-=12*(files[c]-1);
    if(files[c]&&!(files[c-1]||files[c+1]))score-=10*files[c];
  }
  return score;
}
function shelter(board:Board,p:Piece,r:number,c:number,phase:number):number {
  if(p.type!=='k')return 0;
  const row=r+(p.color==='w'?-1:1);
  let count=0;
  for(let f=c-1;f<=c+1;f++)if(inside(row,f)&&board[row][f]?.type==='p'&&board[row][f]?.color===p.color)count++;
  return Math.trunc(count*8*phase/24);
}
export function evaluate(game:Chess,perspective:Side='w'):Evaluation {
  const board=game.board();
  const phase=Math.min(24,board.flat().reduce((n,p)=>n+(p?PHASE[p.type]:0),0));
  const material=materialCp(board);
  let position=0,mob=0,kingSafety=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p)continue;
    const s=sign(p.color);
    position+=s*positional(p,r,c,phase);
    mob+=s*mobility(board,p,r,c)*2;
    kingSafety+=s*shelter(board,p,r,c,phase);
  }
  const pawns=pawnTerms(board,'w')-pawnTerms(board,'b'),s=sign(perspective);
  return {material:s*material,position:s*position,mobility:s*mob,pawns:s*pawns,kingSafety:s*kingSafety,phase,
    total:s*(material+position+mob+pawns+kingSafety)};
}
