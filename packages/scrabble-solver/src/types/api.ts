import { type BoardJson, type Game, type Locale, type ResultJson } from '@scrabble-solver/types';

/**
 * A tile that could be drawn as the unknown rack slot. `isBlank` marks a letter
 * with no copies left in the bag, played by a blank for 0 points.
 */
export interface DrawCandidate {
  character: string;
  isBlank: boolean;
  remainingCount: number;
}

/** The best move a candidate enables, or null when the candidate is unplayable. */
export interface DrawResultJson extends DrawCandidate {
  result: ResultJson | null;
}

export interface SolveDrawsResultJson {
  /** The best move the already-held tiles afford, so each draw's gain is readable. */
  baseline: ResultJson | null;
  draws: DrawResultJson[];
}

export interface SolveRequestPayload {
  board: BoardJson;
  characters: string[];
  game: Game;
  locale: Locale;
}

export interface SolveDrawsRequestPayload {
  board: BoardJson;
  candidates: DrawCandidate[];
  /** The rack tiles the player already holds, with the unknown-draw marker removed. */
  characters: string[];
  game: Game;
  locale: Locale;
}

export interface VerifyRequestPayload {
  board: BoardJson;
  game: Game;
  locale: Locale;
}
