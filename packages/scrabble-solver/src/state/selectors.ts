import { createSelector } from '@reduxjs/toolkit';
import { Game, type Result } from '@scrabble-solver/types';

import { unorderedArraysEqual } from '@/lib/unorderedArraysEqual';

import { selectBoard } from './board';
import { selectDrawRows } from './draws';
import { selectHoveredWord } from './hoveredWord';
import { getDrawCandidates, getRemainingTiles } from './lib';
import { selectCharacters } from './rack';
import { selectProcessedResults, selectResultsResults } from './results';
import { selectConfig, selectLocale } from './settings';
import { selectLastSolvedParameters, selectSolveError } from './solve';
import { selectLastVerifiedBoard } from './verify';

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

export const selectUpToDateResults = createSelector(
  [selectResultsResults, selectAreResultsOutdated, selectSolveError],
  (results, areResultsOutdated, solveError) => {
    return results && !areResultsOutdated && !solveError ? results : null;
  },
);

export const selectUpToDateHoveredWord = createSelector(
  [selectHoveredWord, selectLastVerifiedBoard, selectBoard],
  (hoveredWord, lastVerifiedBoard, board) => {
    return hoveredWord && lastVerifiedBoard.equals(board) ? hoveredWord : null;
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
