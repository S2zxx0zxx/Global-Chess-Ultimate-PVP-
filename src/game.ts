import { Chess, type Move, type Square } from 'chess.js';

export type PlayMode = 'local' | 'computer' | 'puzzle';
export type GameResult = 'white' | 'black' | 'draw' | 'timeout-white' | 'timeout-black';
export type MatchRecord = { id: string; endedAt: string; mode: PlayMode; result: GameResult; pgn: string; moves: number };
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
export function loadJSON<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
}
export function saveJSON(key: string, data: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; }
  catch { return false; }
}
export function shortResult(result: GameResult): string {
  return result === 'draw' ? '½–½' : result.startsWith('timeout') ? 'Time expired' : result === 'white' ? '1–0' : '0–1';
}
