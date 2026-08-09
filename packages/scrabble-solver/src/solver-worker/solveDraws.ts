import { type Gaddag } from '@kamilmielnik/gaddag';
import { getConfig } from '@scrabble-solver/configs';
import { BLANK } from '@scrabble-solver/constants';
import { solve } from '@scrabble-solver/solver';
import { Board, type ResultJson, Tile } from '@scrabble-solver/types';

import { pickBestDrawResult } from '@/lib';
import { type DrawResultJson, type SolveDrawsRequestPayload, type SolveDrawsResultJson } from '@/types';

/**
 * Solves once per candidate seventh tile. Every blank candidate shares a single
 * solve - the rack is the same (fixed tiles plus a blank) and the solver already
 * explores every letter the blank can spell, so those results only need
 * filtering per candidate afterwards.
 *
 * `isCancelled` is checked between candidates: a sweep is long enough that the
 * user can retype mid-run, and its answer is worthless once they do.
 */
export const solveDraws = async (
  gaddag: Gaddag,
  { board: boardJson, candidates, characters, game, locale }: SolveDrawsRequestPayload,
  isCancelled: () => boolean,
  yieldToQueuedMessages: () => Promise<void>,
): Promise<SolveDrawsResultJson | undefined> => {
  const config = getConfig(game, locale);
  const board = Board.fromJson(boardJson);
  const solveWithDraw = (drawnCharacter: string): ResultJson[] => {
    return solve(gaddag, config, board, toTiles([...characters, drawnCharacter]));
  };

  const draws: DrawResultJson[] = [];
  let blankResults: ResultJson[] | undefined;

  for (const candidate of candidates) {
    await yieldToQueuedMessages();

    if (isCancelled()) {
      return undefined;
    }

    if (candidate.isBlank) {
      blankResults ??= solveWithDraw(BLANK);
    }

    const results = candidate.isBlank ? (blankResults ?? []) : solveWithDraw(candidate.character);
    draws.push({ ...candidate, result: pickBestDrawResult(results, candidate, characters) });
  }

  const baselineResults = characters.length > 0 ? solve(gaddag, config, board, toTiles(characters)) : [];

  return { baseline: pickHighestScoring(baselineResults), draws };
};

const toTiles = (characters: string[]): Tile[] => {
  return characters.map((character) => new Tile({ character, isBlank: character === BLANK }));
};

const pickHighestScoring = (results: ResultJson[]): ResultJson | null => {
  let best: ResultJson | null = null;

  for (const result of results) {
    if (!best || result.points > best.points) {
      best = result;
    }
  }

  return best;
};
