import { createSelector } from '@reduxjs/toolkit';

import { type DrawRow } from '@/types';

import { getCoordinates } from '../results/lib';
import { selectShowCoordinates } from '../settings';
import type { RootState } from '../types';

export const selectDraws = (state: RootState) => state.draws;

export const selectDrawsBaseline = createSelector([selectDraws], (draws) => draws.baseline);

const selectDrawsResults = createSelector([selectDraws], (draws) => draws.results);

/**
 * Highest-scoring draw first. Candidates that enable no move sink to the bottom
 * rather than disappearing - "this draw is useless" is an answer worth seeing.
 */
const selectSortedDrawResults = createSelector([selectDrawsResults], (results) => {
  return results ? [...results].sort((a, b) => (b.result?.points ?? -1) - (a.result?.points ?? -1)) : undefined;
});

export const selectDrawRows = createSelector(
  [selectSortedDrawResults, selectShowCoordinates],
  (results, showCoordinates): DrawRow[] | undefined => {
    return results?.map((draw) => ({
      ...draw,
      coordinates: draw.result ? getCoordinates(draw.result, showCoordinates) : '',
    }));
  },
);
