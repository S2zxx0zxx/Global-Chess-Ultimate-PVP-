export type Side = 'w' | 'b';
export type ClockSnapshot = {
  remainingMs: [number, number];
  turn: Side;
  lastAt: number;
};
export type ClockUpdate = {
  state: ClockSnapshot;
  flagged: Side | null;
};

export function newClock(now: number, initialMs = 600000): ClockSnapshot {
  return { remainingMs: [initialMs, initialMs], turn: 'w', lastAt: now };
}
export function advanceClock(snapshot: ClockSnapshot, now: number): ClockUpdate {
  const delta = Math.max(0, now - snapshot.lastAt);
  const side = snapshot.turn === 'w' ? 0 : 1;
  const ms: [number, number] = [...snapshot.remainingMs];
  ms[side] = Math.max(0, ms[side] - delta);
  return {
    state: { ...snapshot, remainingMs: ms, lastAt: Math.max(now, snapshot.lastAt) },
    flagged: ms[side] === 0 ? snapshot.turn : null,
  };
}
export function changeTurn(snapshot: ClockSnapshot, turn: Side, now: number): ClockUpdate {
  const advanced = advanceClock(snapshot, now);
  if (advanced.flagged) return advanced;
  return { state: { ...advanced.state, turn, lastAt: now }, flagged: null };
}
export function displayClock(ms: number): string {
  const wholeSeconds = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(wholeSeconds / 60) + ':' + String(wholeSeconds % 60).padStart(2, '0');
}
