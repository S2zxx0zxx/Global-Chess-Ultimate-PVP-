import { Chess, type Move, type Square } from 'chess.js';

export type PlayMode = 'local' | 'computer' | 'puzzle';
export type GameResult = 'white' | 'black' | 'draw' | 'timeout-white' | 'timeout-black';
export type MatchRecord = { id: string; endedAt: string; mode: PlayMode; result: GameResult; pgn: string; moves: number; playerSide?:'w'|'b'; difficulty?:'easy'|'medium'|'hard'|'expert' };
export const STORAGE_KEYS = {
  guest: 'gcu.guest.v1',
  lastMatch: 'gcu.lastMatch.v1',
  history: 'gcu.history.v1',
  settings: 'gcu.settings.v1',
} as const;

export const PIECE_GLYPHS: Record<'w' | 'b', Record<string, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export const FILES = 'abcdefgh';
export const SQUARES: Square[] = Array.from({ length: 64 }, (_, i) => (FILES[i % 8] + (8 - Math.floor(i / 8))) as Square);
export const PRACTICE = {
  fen: '4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1',
  target: { from: 'd3', to: 'd5' },
  title: 'Royal Tactics · Capture',
  instruction: 'White to move. Capture the exposed queen with your rook.',
} as const;

export function chooseComputerMove(game: Chess): Move | undefined {
  const legal = game.moves({ verbose: true });
  if (!legal.length) return undefined;
  const score = (move: Move) => {
    const values: Record<string, number> = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };
    let value = (move.captured ? values[move.captured] * 20 : 0) + (move.promotion ? 75 : 0);
    const test = new Chess(game.fen());
    test.move(move);
    if (test.isCheckmate()) value += 10000;
    else if (test.isCheck()) value += 3;
    const file = move.to.charCodeAt(0) - 97;
    const rank = Number(move.to[1]) - 1;
    value += (3.5 - Math.abs(file - 3.5) + 3.5 - Math.abs(rank - 3.5)) * 0.15;
    return value;
  };
  return legal.sort((a, b) => score(b) - score(a) || a.lan.localeCompare(b.lan))[0];
}
export function resultOf(game: Chess): GameResult | null {
  if (game.isCheckmate()) return game.turn() === 'w' ? 'black' : 'white';
  if (game.isGameOver()) return 'draw';
  return null;
}
// Untrusted storage can contain valid JSON with the wrong shape.
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const one=(v:unknown,a:string[])=>typeof v==='string'&&a.includes(v);
const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const bool=(v:unknown)=>v===undefined||typeof v==='boolean';
const pair=(v:unknown)=>Array.isArray(v)&&v.length===2&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0);
const record=(v:unknown)=>obj(v)&&typeof v.id==='string'&&typeof v.endedAt==='string'&&Number.isFinite(Date.parse(v.endedAt))&&one(v.mode,['local','computer','puzzle'])&&one(v.result,['white','black','draw','timeout-white','timeout-black'])&&typeof v.pgn==='string'&&typeof v.moves==='number'&&Number.isSafeInteger(v.moves)&&v.moves>=0;
export function validStoredValue(key:string,v:unknown):boolean{
 switch(key){
 case STORAGE_KEYS.guest:return typeof v==='string'&&v.trim().length>0&&v.length<=100;
 case STORAGE_KEYS.history:return Array.isArray(v)&&v.every(record);
 case STORAGE_KEYS.lastMatch:return v===null||obj(v)&&typeof v.fen==='string'&&(v.pgn===undefined||typeof v.pgn==='string')&&one(v.mode,['local','computer','puzzle'])&&typeof v.active==='boolean'&&(v.seconds===undefined||pair(v.seconds))&&(v.remainingMs===undefined||pair(v.remainingMs))&&bool(v.timed);
 case STORAGE_KEYS.settings:return obj(v)&&bool(v.flipped)&&bool(v.reducedMotion)&&bool(v.hints)&&bool(v.useLibraryAssets)&&(v.modelTheme===undefined||one(v.modelTheme,['deco','bauhaus','scifi','egypt','classic','voxel','voxel-wood','premium-low','premium-low-fantasy','premium-high','premium-high-fantasy']));
 case 'gcu.royal-ui.v1':return obj(v)&&bool(v.completedIntro)&&bool(v.haptics)&&bool(v.contrast)&&(v.readIds===undefined||strings(v.readIds))&&(v.skin===undefined||one(v.skin,['wood','ivory','onyx','stone','bg-black-tan','bg-black-white','bg-brown-tan','bg-brown-white','bg-red-tan','bg-red-white','bg-tan-black','bg-white-black']))&&(v.avatar===undefined||one(v.avatar,['king','knight','queen']))&&(v.frame===undefined||one(v.frame,['gold','bronze','onyx']));
 case 'gcu.puzzles.solved.v1':return strings(v);
 default:return true;
 }
}
export function loadJSON<T>(key:string,fallback:T):T {
 try{
  const raw=localStorage.getItem(key);if(raw===null)return fallback;
  const v:unknown=JSON.parse(raw);if(validStoredValue(key,v))return v as T;
  if(key===STORAGE_KEYS.history&&Array.isArray(v))return v.filter(record) as T;
  if(key==='gcu.puzzles.solved.v1'&&Array.isArray(v))return v.filter(x=>typeof x==='string') as T;
  return fallback;
 }catch{return fallback;}
}
export function saveJSON(key:string,data:unknown):boolean{
 try{
  if(!validStoredValue(key,data))return false;
  const old=localStorage.getItem(key);
  if(old!==null){
   let valid=false;try{valid=validStoredValue(key,JSON.parse(old));}catch{}
   if(!valid){
    const backup=key+'.recovery.v1',previous=localStorage.getItem(backup);
    if(previous!==null&&previous!==old)return false;
    if(previous===null)localStorage.setItem(backup,old);
   }
  }
  localStorage.setItem(key,JSON.stringify(data));return true;
 }catch{return false;}
}
export function shortResult(result: GameResult): string {
  return result === 'draw' ? '½–½' : result.startsWith('timeout') ? 'Time expired' : result === 'white' ? '1–0' : '0–1';
}
