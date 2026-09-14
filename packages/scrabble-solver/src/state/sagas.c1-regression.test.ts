import { configureStore } from '@reduxjs/toolkit';
import { Game, Locale } from '@scrabble-solver/types';
import { describe, expect, it, mock } from 'bun:test';
import reduxSaga from 'redux-saga';

import { appSlice } from './app';
import { boardSlice } from './board';
import { cellFiltersSlice } from './cellFilters';
import { dictionarySlice } from './dictionary';
import { drawsSlice } from './draws';
import { hoveredTileSlice } from './hoveredTile';
import { hoveredWordSlice } from './hoveredWord';
import { i18nSlice } from './i18n';
import { rackSlice } from './rack';
import { resultsSlice } from './results';
import type * as sagasModule from './sagas';
import { settingsSlice } from './settings';
import { solveSlice } from './solve';
import { verifySlice } from './verify';

/**
 * Mocking only `./selectors` (never touched by C1 itself) exercises the fully
 * synchronous `solveDrawsForRack` zero-candidates branch - the exact shape that
 * makes a forked `onSolve`'s puts race against the parent's later puts.
 */
await mock.module('./selectors', () => ({
  selectDrawCandidates: () => [],
  selectIsDuplicatCompletiv: () => true,
}));

const { rootSaga }: typeof sagasModule = await import('./sagas');

const createTestStore = () => {
  const sagaMiddleware = reduxSaga();

  const store = configureStore({
    reducer: {
      app: appSlice.reducer,
      board: boardSlice.reducer,
      cellFilters: cellFiltersSlice.reducer,
      dictionary: dictionarySlice.reducer,
      draws: drawsSlice.reducer,
      hoveredTile: hoveredTileSlice.reducer,
      hoveredWord: hoveredWordSlice.reducer,
      i18n: i18nSlice.reducer,
      rack: rackSlice.reducer,
      results: resultsSlice.reducer,
      settings: settingsSlice.reducer,
      solve: solveSlice.reducer,
      verify: verifySlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat([sagaMiddleware]),
  });

  sagaMiddleware.run(rootSaga);

  return store;
};

/**
 * Polls until the store's state stops changing between two ticks instead of
 * waiting a fixed duration - a blind `setTimeout` flush could assert before
 * an in-flight saga (e.g. a forked `onSolve`) has finished dispatching.
 */
const flushSagas = async (store: ReturnType<typeof createTestStore>, maxTicks = 20): Promise<void> => {
  let previous = JSON.stringify(store.getState());

  for (let tick = 0; tick < maxTicks; tick += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const next = JSON.stringify(store.getState());

    if (next === previous) {
      return;
    }

    previous = next;
  }

  throw new Error('flushSagas: store state did not stabilize within the tick budget');
};

describe('sagas - C1 regression: drawsSlice.actions.reset() ordering', () => {
  it('does not clobber freshly-solved draws results when changing the game (zero-candidates sync path)', async () => {
    const store = createTestStore();

    store.dispatch(rackSlice.actions.changeCharacters({ characters: ['c', 'a', 't'], index: 0 }));
    store.dispatch(settingsSlice.actions.changeGame(Game.DuplicatCompletiv));

    await flushSagas(store);

    expect(store.getState().draws.results).toBeDefined();
  });

  it('does not clobber freshly-solved draws results when changing the locale (zero-candidates sync path)', async () => {
    const store = createTestStore();

    store.dispatch(rackSlice.actions.changeCharacters({ characters: ['c', 'a', 't'], index: 0 }));
    store.dispatch(settingsSlice.actions.changeGame(Game.DuplicatCompletiv));
    await flushSagas(store);

    // Prove the final assertion is driven by the locale-change path itself,
    // not leftover state from the changeGame dispatch above.
    store.dispatch(drawsSlice.actions.reset());

    expect(store.getState().draws.results).toBeUndefined();

    store.dispatch(settingsSlice.actions.changeLocale(Locale.EN_GB));
    await flushSagas(store);

    expect(store.getState().draws.results).toBeDefined();
  });
});
