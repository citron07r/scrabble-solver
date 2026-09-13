import { createSelector } from '@reduxjs/toolkit';

import { type DrawRow } from '@/types';

import { getCoordinates } from '../results/lib';
import { selectShowCoordinates } from '../settings';
import type { RootState } from '../types';

export const selectDraws = (state: RootState) => state.draws;

export const selectDrawsBaseline = createSelector([selectDraws], (draws) => draws.baseline);

const selectDrawsResults = createSelector([selectDraws], (draws) => draws.results);

/**
 * One row per move, not per candidate: a draw can reach its best score with more
 * than one word, and every one of them belongs in the list. A candidate that
 * enables nothing still gets a row, so "this draw is useless" stays visible.
 */
export const selectDrawRows = createSelector(
  [selectDrawsResults, selectShowCoordinates],
  (draws, showCoordinates): DrawRow[] | undefined => {
    const rows: DrawRow[] | undefined = draws?.flatMap<DrawRow>(({ results, ...candidate }) =>
      results.length === 0
        ? [{ ...candidate, coordinates: '', result: null }]
        : results.map((result) => ({ ...candidate, coordinates: getCoordinates(result, showCoordinates), result })),
    );

    return rows?.sort((a, b) => (b.result?.points ?? -1) - (a.result?.points ?? -1));
  },
);
