import { Chess, type Move } from 'chess.js';

export const PROTOCOL = 1 as const;
export const MAX_HISTORY = 1024;
export const MAX_TIME_MS = 2000;
export const MAX_NODES = 256;
export const HARD_GRACE_MS = 120;
export type Strategy = 'legacy' | 'foundation';
export type Identity = { searchId: string; gameId: string; revision: number };
export type Position = { initialFen: string; moves: string[]; fen: string };
export type Request = Identity & {
  protocol: 1; type: 'search'; purpose: 'play' | 'analysis'; strategy: Strategy;
  position: Position; limits: { timeMs: number; maxDepth: 1; maxNodes: number }; seed: number;
};
export type Score = { kind: 'cp'; value: number; perspective: 'w' | 'b' } |
  { kind: 'mate'; winner: 'w' | 'b'; plies: number; perspective: 'w' | 'b' };
export type Status = 'complete' | 'timeout' | 'terminal' | 'error' | 'fallback' | 'cancelled';
export type Reason = 'none' | 'deadline' | 'node-limit' | 'invalid-request' | 'worker-error' |
  'invalid-response' | 'unavailable' | 'cancelled' | 'terminal' | 'legacy-recovery';
export type Response = Identity & {
  protocol: 1; type: 'result'; status: Status; reason: Reason;
  move: string | null; pv: string[]; score: Score | null; completedDepth: 0 | 1;
  nodes: number | null; elapsedMs: number; strategy: Strategy;
};
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const id = (x: unknown): x is string => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(x);
const integer = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= max;
const fen = (x: unknown): x is string => typeof x === 'string' && x.length <= 160 && /^[prnbqkPRNBQK1-8/]+ [wb] (?:-|[KQkq]{1,4}) (?:-|[a-h][36]) [0-9]{1,7} [0-9]{1,7}$/.test(x);
export const isUci = (x: unknown): x is string => typeof x === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(x);
export const uci = (m: Move): string => m.from + m.to + (m.promotion ?? '');
export function moveInput(s: string) {
  if (!isUci(s)) throw new Error('Invalid UCI');
  return { from: s.slice(0,2), to: s.slice(2,4), ...(s.length===5 ? {promotion:s[4]} : {}) };
}
export function positionOf(game: Chess): Position {
  const moves=game.history({verbose:true});
  return { initialFen:moves[0]?.before ?? game.fen(), moves:moves.map(uci), fen:game.fen() };
}
export function samePosition(game: Chess, expected: Position): boolean {
  if(game.fen()!==expected.fen) return false;
  const actual=positionOf(game);
  return actual.initialFen===expected.initialFen && actual.moves.length===expected.moves.length &&
    actual.moves.every((m,i)=>m===expected.moves[i]);
}
export function validRequest(x: unknown): x is Request {
  if(!isObject(x)||x.protocol!==PROTOCOL||x.type!=='search'||!id(x.searchId)||!id(x.gameId)||
     !integer(x.revision,0,Number.MAX_SAFE_INTEGER)||!integer(x.seed,0,0xffffffff)||
     !['play','analysis'].includes(String(x.purpose))||!['legacy','foundation'].includes(String(x.strategy))) return false;
  const p=x.position,l=x.limits;
  return isObject(p)&&fen(p.initialFen)&&fen(p.fen)&&Array.isArray(p.moves)&&p.moves.length<=MAX_HISTORY&&p.moves.every(isUci)&&
    isObject(l)&&integer(l.timeMs,1,MAX_TIME_MS)&&l.maxDepth===1&&integer(l.maxNodes,1,MAX_NODES);
}
export function reconstruct(req: Request): Chess {
  if(!validRequest(req))throw new Error('Invalid request');
  const g=new Chess(req.position.initialFen);
  if(g.fen()!==req.position.initialFen)throw new Error('Noncanonical initial FEN');
  for(const u of req.position.moves) {
    if(g.isGameOver())throw new Error('Moves after terminal position');
    const m=g.move(moveInput(u));
    if(uci(m)!==u)throw new Error('Move mismatch');
  }
  if(g.fen()!==req.position.fen)throw new Error('Position mismatch');
  return g;
}
export function result(req: Request, patch: Partial<Omit<Response,keyof Identity|'protocol'|'type'|'strategy'>>={}): Response {
  return { protocol:PROTOCOL,type:'result',searchId:req.searchId,gameId:req.gameId,revision:req.revision,strategy:req.strategy,
    status:'error',reason:'invalid-request',move:null,pv:[],score:null,completedDepth:0,nodes:null,elapsedMs:0,...patch };
}
const validScore=(s:unknown):s is Score=>isObject(s)&&['w','b'].includes(String(s.perspective))&&
  (s.kind==='cp'?integer(s.value,-100000,100000):s.kind==='mate'&&['w','b'].includes(String(s.winner))&&integer(s.plies,0,1));
export function validResponse(x:unknown, req:Request, legal:ReadonlySet<string>, terminal:boolean): x is Response {
  if(!isObject(x)||x.protocol!==PROTOCOL||x.type!=='result'||x.searchId!==req.searchId||x.gameId!==req.gameId||
     x.revision!==req.revision||x.strategy!==req.strategy||!['complete','timeout','terminal','error'].includes(String(x.status))||
     !['none','deadline','node-limit','invalid-request','worker-error','terminal','legacy-recovery'].includes(String(x.reason))||
     !integer(x.completedDepth,0,1)||!(x.nodes===null||integer(x.nodes,0,MAX_NODES))||
     typeof x.elapsedMs!=='number'||!Number.isFinite(x.elapsedMs)||x.elapsedMs<0||x.elapsedMs>60000||
     !Array.isArray(x.pv)||x.pv.length>1||!(x.score===null||validScore(x.score))) return false;
  if(x.move===null ? x.pv.length!==0 : !isUci(x.move)||!legal.has(x.move)||x.pv.length!==1||x.pv[0]!==x.move)return false;
  if(x.status==='terminal')return terminal&&x.move===null&&x.completedDepth===0&&x.reason==='terminal';
  if(terminal)return false;
  if(x.status==='error')return x.move===null&&x.score===null&&x.completedDepth===0&&['invalid-request','worker-error'].includes(String(x.reason));
  if(x.status==='timeout')return x.completedDepth===0&&x.score===null&&['deadline','node-limit'].includes(String(x.reason));
  if(x.move===null)return false;
  if(req.strategy==='legacy'||x.reason==='legacy-recovery')return x.completedDepth===0&&x.score===null&&x.nodes===null&&(x.reason==='none'||x.reason==='legacy-recovery');
  return x.reason==='none'&&x.completedDepth===1&&x.score!==null&&typeof x.nodes==='number'&&x.nodes>0&&x.nodes<=req.limits.maxNodes;
}
