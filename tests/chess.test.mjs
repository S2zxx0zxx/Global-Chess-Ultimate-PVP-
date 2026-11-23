import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

test('legal openings are available', () => {
  const game = new Chess();
  assert.equal(game.moves().length, 20);
  game.move('e4'); game.move('e5'); game.move('Nf3');
  assert.equal(game.turn(), 'b');
});
test('checkmate is recognized', () => {
  const game = new Chess();
  for (const san of ['f3', 'e5', 'g4', 'Qh4#']) game.move(san);
  assert.equal(game.isCheckmate(), true);
  assert.equal(game.isGameOver(), true);
});
test('castling rights and check filtering are enforced', () => {
  const game = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(game.moves({ square: 'e1' }).includes('O-O'));
  game.move('O-O');
  assert.equal(game.get('g1')?.type, 'k');
});
test('en passant and promotion are legal', () => {
  const game = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  game.move({ from: 'a7', to: 'a8', promotion: 'q' });
  assert.equal(game.get('a8')?.type, 'q');
});
