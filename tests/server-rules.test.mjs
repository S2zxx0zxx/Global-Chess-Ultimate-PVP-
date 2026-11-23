import test from 'node:test';
import assert from 'node:assert/strict';
import { initialMatch, applyMove, publicMatchState } from '../server/src/rules.mjs';

test('private match validates side, turn, legal squares and replay ids', () => {
  let match = initialMatch('host-token', Date.now() + 100000);
  match.status = 'active';
  const white = { type: 'move', from: 'e2', to: 'e4', id: 'initial001', revision: 0 };
  assert.equal(applyMove(match, 'b', white).error, 'NOT_YOUR_TURN');
  const accepted = applyMove(match, 'w', white);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.next.revision, 1);
  assert.equal(applyMove(accepted.next, 'w', white).error, 'DUPLICATE_MOVE');
  assert.equal(applyMove(accepted.next, 'w', { type:'move',from:'e7',to:'e5',id:'secondmove12',revision:1 }).error, 'NOT_YOUR_TURN');
  const black = applyMove(accepted.next, 'b', { type:'move',from:'e7',to:'e5',id:'secondmove12',revision:1 });
  assert.equal(black.ok, true);
  assert.equal(publicMatchState(black.next, 'w').turn, 'w');
  assert.equal(applyMove(black.next, 'w', { type:'move',from:'a1',to:'a8',id:'badchess32',revision:2 }).error, 'ILLEGAL_MOVE');
});
test('private match refuses stale revisions and malformed commands', () => {
  const match = { ...initialMatch('host-token', Date.now()+10000), status:'active' };
  assert.equal(applyMove(match,'w',{type:'move',from:'e2',to:'e4',id:'validid132',revision:3}).error,'STALE_REVISION');
  assert.equal(applyMove(match,'w',{type:'move',from:'z9',to:'e4',id:'validid134',revision:0}).error,'BAD_COMMAND');
});
