import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const data = JSON.parse(await readFile(new URL('../src/data/puzzles.json', import.meta.url), 'utf8'));
test('all curated puzzles start legally and solve with their advertised move', () => {
  assert.ok(data.length >= 5);
  assert.equal(new Set(data.map(p => p.id)).size, data.length);
  for (const puzzle of data) {
    const game = new Chess(puzzle.fen);
    const legal = game.moves({ verbose: true });
    assert.ok(legal.some(move => move.from === puzzle.from && move.to === puzzle.to &&
      (!puzzle.promotion || move.promotion === puzzle.promotion)), puzzle.id + ': solution not legal');
    const played = game.move({ from: puzzle.from, to: puzzle.to, promotion: puzzle.promotion || 'q' });
    assert.ok(played, puzzle.id + ': expected legal move');
    if (puzzle.id === 'fools-mate') assert.ok(game.isCheckmate(), 'fools-mate must really be checkmate');
  }
});
