import { Chess } from 'chess.js';

const SQUARE = /^[a-h][1-8]$/;
const MESSAGE_ID = /^[a-zA-Z0-9_-]{8,64}$/;

export function initialMatch(hostToken, expiresAt) {
  const game = new Chess();
  return {
    fen: game.fen(),
    pgn: '',
    revision: 0,
    status: 'waiting',
    hostToken,
    guestToken: null,
    recentIds: [],
    expiresAt,
  };
}
export function publicMatchState(match, side) {
  const game = new Chess();
  if (match.pgn) game.loadPgn(match.pgn);
  return {
    type: 'state', fen: game.fen(), pgn: game.pgn(), turn: game.turn(),
    side, status: match.status, revision: match.revision,
    isCheck: game.isCheck(), isGameOver: game.isGameOver(),
    result: game.isCheckmate() ? (game.turn() === 'w' ? 'black' : 'white') : game.isDraw() ? 'draw' : null,
  };
}
export function applyMove(match, side, command) {
  if (match.status !== 'active') return { ok: false, error: 'ROOM_NOT_ACTIVE' };
  if (typeof command !== 'object' || command === null || command.type !== 'move' ||
      !MESSAGE_ID.test(command.id || '') ||
      !SQUARE.test(command.from || '') || !SQUARE.test(command.to || '')) return { ok: false, error: 'BAD_COMMAND' };
  if (match.recentIds.includes(command.id)) return { ok: false, error: 'DUPLICATE_MOVE' };
  if (command.revision !== match.revision) return { ok: false, error: 'STALE_REVISION' };
  const game = new Chess();
  try { if (match.pgn) game.loadPgn(match.pgn); }
  catch { return { ok: false, error: 'CORRUPT_MATCH' }; }
  if (game.isGameOver()) return { ok: false, error: 'GAME_OVER' };
  if (game.turn() !== side) return { ok: false, error: 'NOT_YOUR_TURN' };
  const promotion = typeof command.promotion === 'string' && /^[qrbn]$/.test(command.promotion) ? command.promotion : 'q';
  try {
    const played = game.move({ from: command.from, to: command.to, promotion });
    if (!played) return { ok: false, error: 'ILLEGAL_MOVE' };
  } catch { return { ok: false, error: 'ILLEGAL_MOVE' }; }
  return {
    ok: true,
    next: {
      ...match,
      fen: game.fen(),
      pgn: game.pgn(),
      revision: match.revision + 1,
      recentIds: [...match.recentIds.slice(-127), command.id],
      status: game.isGameOver() ? 'finished' : 'active',
    },
  };
}
