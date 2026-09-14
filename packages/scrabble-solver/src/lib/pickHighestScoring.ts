import { type ResultJson } from '@scrabble-solver/types';

/** The single highest-scoring move, or null when there are none to compare. */
export const pickHighestScoring = (results: ResultJson[]): ResultJson | null => {
  let best: ResultJson | null = null;

  for (const result of results) {
    if (!best || result.points > best.points) {
      best = result;
    }
  }

  return best;
};
