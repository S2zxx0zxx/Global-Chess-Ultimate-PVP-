import test from 'node:test';
import assert from 'node:assert/strict';
import { newClock, advanceClock, changeTurn, displayClock } from '../src/clock.ts';

test('local clocks reconcile wall elapsed time, including delayed tab timers', () => {
  const first = newClock(1000, 600000);
  const after = advanceClock(first, 1000 + 5300);
  assert.equal(after.state.remainingMs[0], 594700);
  assert.equal(after.state.remainingMs[1], 600000);
  assert.equal(after.flagged, null);
  const switchSide = changeTurn(after.state, 'b', 6300);
  const next = advanceClock(switchSide.state, 10300);
  assert.equal(next.state.remainingMs[0], 594700);
  assert.equal(next.state.remainingMs[1], 596000);
  assert.equal(displayClock(59999), '1:00');
  assert.equal(displayClock(0), '0:00');
});
test('clock detects timeouts and does not move backwards when system time decreases', () => {
  const first = newClock(100, 1200);
  const flagged = advanceClock(first, 1400);
  assert.equal(flagged.flagged, 'w');
  assert.equal(flagged.state.remainingMs[0], 0);
  const backwards = advanceClock(newClock(1000, 5000), 500);
  assert.equal(backwards.state.remainingMs[0], 5000);
});
