import { type Result } from '@scrabble-solver/types';

import { type DrawResult } from '@/types';

export interface DrawsState {
  /** The best move the already-held tiles afford, so each draw's gain is readable. */
  baseline: Result | null;
  results: DrawResult[] | undefined;
}
