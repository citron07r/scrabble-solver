import { createSelector } from '@reduxjs/toolkit';
import { Game, type Result } from '@scrabble-solver/types';

import { unorderedArraysEqual } from '@/lib';

import { selectBoard } from './board';
import { selectDrawRows } from './draws';
import { getDrawCandidates, getRemainingTiles } from './lib';
import { selectCharacters } from './rack';
import { selectProcessedResults } from './results';
import { selectConfig, selectLocale } from './settings';
import { selectLastSolvedParameters } from './solve';

const selectHasBoardChanged = createSelector(
  [selectLastSolvedParameters, selectBoard],
  (lastSolvedParameters, board) => {
    return !lastSolvedParameters.board.equals(board);
  },
);

const selectHaveCharactersChanged = createSelector(
  [selectLastSolvedParameters, selectCharacters, selectLocale],
  (lastSolvedParameters, characters, locale) => {
    return !unorderedArraysEqual(lastSolvedParameters.characters, characters, locale);
  },
);

export const selectAreResultsOutdated = createSelector(
  [selectHasBoardChanged, selectHaveCharactersChanged],
  (hasBoardChanged, haveCharactersChanged) => {
    return hasBoardChanged || haveCharactersChanged;
  },
);

export const selectRemainingTiles = createSelector(
  [selectConfig, selectBoard, selectCharacters, selectLocale],
  getRemainingTiles,
);

export const selectDrawCandidates = createSelector([selectConfig, selectRemainingTiles], getDrawCandidates);

/** The Duplicat Completiv holds six fixed tiles; the seventh comes from the bag. */
export const selectIsDuplicatCompletiv = createSelector(
  [selectConfig],
  (config) => config.game === Game.DuplicatCompletiv,
);

/**
 * The moves the compact controls step through. In draw mode the plain results
 * list is empty, so they walk the best move per candidate instead.
 */
export const selectNavigableResults = createSelector(
  [selectIsDuplicatCompletiv, selectProcessedResults, selectDrawRows],
  (isDuplicatCompletiv, results, rows): Result[] | undefined => {
    if (!isDuplicatCompletiv) {
      return results;
    }

    return rows?.map(({ result }) => result).filter((result) => result !== null);
  },
);
