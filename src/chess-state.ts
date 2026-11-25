import { Chess, type Move } from 'chess.js';

export type ReplayTimeline = { initialFen: string; moves: Move[] };

/** Preserve the original setup position and history, including nonstandard PGN starts. */
export function replayTimeline(pgn: string): ReplayTimeline {
  const match = new Chess();
  match.loadPgn(pgn);
  const moves = match.history({ verbose: true });
  return { initialFen: moves[0]?.before ?? match.fen(), moves };
}

/** Build a canonical position with its complete prefix history, not a FEN-only clone. */
export function replayPosition(timeline: ReplayTimeline, ply: number): Chess {
  if (!Number.isSafeInteger(ply) || ply < 0 || ply > timeline.moves.length) {
    throw new RangeError('Invalid replay ply');
  }
  const position = new Chess(timeline.initialFen);
  for (const { from, to, promotion } of timeline.moves.slice(0, ply)) {
    position.move({ from, to, promotion });
  }
  return position;
}
