import { Chess } from 'chess.js';

// Independent public-API traversal. Perft counts legal move paths, not claim-based game termination.
function walk(game, depth) {
  if (depth === 0) return 1n;
  if (depth === 1) return BigInt(game.moves().length);
  let total = 0n;
  for (const move of game.moves({ verbose: true })) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion });
    try { total += walk(game, depth - 1); }
    finally { game.undo(); }
  }
  return total;
}

function depthCheck(depth, minimum) {
  if (!Number.isSafeInteger(depth) || depth < minimum || depth > 6)
    throw new RangeError('Unsupported perft depth (maximum 6)');
}

export function perft(game, depth) {
  depthCheck(depth, 0);
  if (!(game instanceof Chess)) throw new TypeError('Chess instance required');
  return walk(game, depth);
}

export function divide(game, depth) {
  depthCheck(depth, 1);
  const branches = new Map();
  for (const move of game.moves({ verbose: true })) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion });
    try { branches.set(move.lan, walk(game, depth - 1)); }
    finally { game.undo(); }
  }
  return branches;
}
