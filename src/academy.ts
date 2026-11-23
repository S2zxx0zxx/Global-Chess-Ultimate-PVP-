import catalog from './data/puzzles.json';

export type Puzzle = {
  id: string;
  title: string;
  level: string;
  fen: string;
  from: string;
  to: string;
  promotion: string | null;
  prompt: string;
  explanation: string;
};

export const PUZZLES: readonly Puzzle[] = catalog as Puzzle[];
export const PUZZLE_PROGRESS_KEY = 'gcu.puzzles.solved.v1';
export function solvedCount(ids: string[]): number {
  const known = new Set(PUZZLES.map(p => p.id));
  return new Set(ids.filter(id => known.has(id))).size;
}
export function isPuzzleSolution(puzzle: Puzzle, from: string, to: string, promotion?: string): boolean {
  return puzzle.from === from && puzzle.to === to &&
    (!puzzle.promotion || puzzle.promotion === (promotion || 'q'));
}
