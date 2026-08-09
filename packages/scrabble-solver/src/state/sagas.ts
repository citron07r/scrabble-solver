/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { type PayloadAction } from '@reduxjs/toolkit';
import { hasConfig, languages } from '@scrabble-solver/configs';
import { Board, type ConfigJson, type Locale, type Result } from '@scrabble-solver/types';
import { call, delay, put, select, spawn, takeEvery, takeLatest } from 'redux-saga/effects';

import { LOCALE_FEATURES } from '@/i18n';
import { memoize } from '@/lib';
import { findWordDefinitions, solve, solveDraws, verify, visit } from '@/sdk';
import { prefetchDictionary } from '@/solver-worker';

import { initialize, reset } from './actions';
import { boardSlice, selectBoard } from './board';
import { cellFiltersSlice, selectCellFilter } from './cellFilters';
import { dictionarySlice, selectDictionary } from './dictionary';
import { drawsSlice } from './draws';
import { rackSlice, selectCharacters, selectRack } from './rack';
import { resultsSlice } from './results';
import { selectDrawCandidates, selectIsDuplicatCompletiv } from './selectors';
import {
  selectConfig,
  selectGame,
  selectLocale,
  selectLocaleAutoGroupTiles,
  selectRemoveCellFilters,
  settingsSlice,
} from './settings';
import { solveSlice } from './solve';
import { verifySlice } from './verify';

const SUBMIT_DELAY = 150;

const memoizedFindWordDefinitions = memoize(findWordDefinitions);

// Can't conveniently type generators for sagas yet,
// see: https://github.com/microsoft/TypeScript/issues/43632
type AnyGenerator = Generator<any, any, any>;

export function* rootSaga(): AnyGenerator {
  yield takeEvery(boardSlice.actions.changeCellValue.type, onCellValueChange);
  yield takeEvery([rackSlice.actions.changeCharacter.type, rackSlice.actions.changeCharacters.type], onRackValueChange);
  yield takeEvery(resultsSlice.actions.applyResult.type, onApplyResult);
  yield takeLatest(resultsSlice.actions.changeResultCandidate.type, onResultCandidateChange);
  yield takeEvery(settingsSlice.actions.changeGame.type, onGameChange);
  yield takeEvery(settingsSlice.actions.changeLocale.type, onLocaleChange);
  yield takeLatest(dictionarySlice.actions.submit.type, onDictionarySubmit);
  yield takeLatest(initialize.type, onInitialize);
  yield takeLatest(reset.type, onReset);
  yield takeLatest(solveSlice.actions.submit.type, onSolve);
  yield takeLatest(verifySlice.actions.submit.type, onVerify);
}

function* onCellValueChange({ payload }: PayloadAction<{ value: string; x: number; y: number }>): AnyGenerator {
  const filter = yield select((state) => selectCellFilter(state, payload));

  if (filter) {
    yield put(cellFiltersSlice.actions.cancel(payload));
  }

  yield put(resultsSlice.actions.changeResultCandidate(null));
  yield put(verifySlice.actions.submit());
}

function* onRackValueChange(): AnyGenerator {
  yield put(resultsSlice.actions.changeResultCandidate(null));
}

function* onApplyResult({ payload: result }: PayloadAction<Result>): AnyGenerator {
  const autoGroupTiles = yield select(selectLocaleAutoGroupTiles);
  const removeCellFilters = yield select(selectRemoveCellFilters);
  yield put(boardSlice.actions.applyResult(result));
  if (removeCellFilters === 'never') {
    yield put(cellFiltersSlice.actions.removeCells(result.cells));
  } else {
    yield put(cellFiltersSlice.actions.reset());
  }
  yield put(rackSlice.actions.removeTiles(result.tiles));
  yield put(rackSlice.actions.groupTiles(autoGroupTiles));
  yield put(verifySlice.actions.submit());
}

function* onGameChange(): AnyGenerator {
  const characters = yield select(selectCharacters);

  if (characters.length > 0) {
    yield put(solveSlice.actions.submit());
  } else {
    yield put(resultsSlice.actions.reset());
  }

  yield put(drawsSlice.actions.reset());
  yield put(resultsSlice.actions.reset());
  yield* resetRack();
  yield put(verifySlice.actions.submit());
}

function* onDictionarySubmit(): AnyGenerator {
  const { input: word } = yield select(selectDictionary);
  const locale = yield select(selectLocale);

  if (!memoizedFindWordDefinitions.hasCache(locale, word)) {
    yield delay(SUBMIT_DELAY);
  }

  try {
    const wordDefinitions = yield call(memoizedFindWordDefinitions, locale, word);
    const { input: currentWord } = yield select(selectDictionary);

    if (word === currentWord) {
      yield put(dictionarySlice.actions.submitSuccess(wordDefinitions));
    }
  } catch (error) {
    const { input: currentWord } = yield select(selectDictionary);

    if (word === currentWord) {
      yield put(dictionarySlice.actions.submitFailure(error));
    }
  }
}

function* onInitialize(): AnyGenerator {
  const board = yield select(selectBoard);
  const locale = yield select(selectLocale);

  yield spawn(prefetchDictionary, locale);
  // Detached: offline, a failed visit would otherwise tear down the whole root saga.
  yield spawn(visit);

  // Unconditional: a rack persisted under a different game keeps that game's
  // length, which would leave Duplicat Completiv holding more than its six fixed tiles.
  yield* resetRack();

  if (!board.isEmpty()) {
    yield put(verifySlice.actions.submit());
  }
}

function* onReset(): AnyGenerator {
  const config = yield select(selectConfig);

  yield put(boardSlice.actions.init(Board.create(config.boardWidth, config.boardHeight)));
  yield put(cellFiltersSlice.actions.reset());
  yield put(dictionarySlice.actions.reset());
  yield put(drawsSlice.actions.reset());
  yield put(rackSlice.actions.reset());
  // rackDefaultState is fixed at module load from the game that was persisted
  // then, so it can be the wrong length for the game selected now.
  yield* resetRack();
  yield put(resultsSlice.actions.reset());
  yield put(solveSlice.actions.reset());
  yield put(verifySlice.actions.submit());
}

function* onLocaleChange({ payload: locale }: PayloadAction<Locale>): AnyGenerator {
  yield spawn(prefetchDictionary, locale);

  const game = yield select(selectGame);

  if (!hasConfig(game, locale)) {
    const defaultConfig = Object.values(languages).find((config) => config.locale === locale);

    if (defaultConfig) {
      yield put(settingsSlice.actions.changeGame(defaultConfig.game));
    }
  }

  const characters = yield select(selectCharacters);

  if (characters.length > 0) {
    yield put(solveSlice.actions.submit());
  } else {
    yield put(resultsSlice.actions.reset());
  }

  yield put(dictionarySlice.actions.reset());
  yield put(drawsSlice.actions.reset());
  yield put(resultsSlice.actions.changeResultCandidate(null));
  yield put(verifySlice.actions.submit());
}

function* onResultCandidateChange({ payload: result }: PayloadAction<Result | null>): AnyGenerator {
  if (!result) {
    return;
  }

  yield delay(SUBMIT_DELAY);

  const locale: Locale = yield select(selectLocale);
  const uniqueWords = Array.from(new Set(result.words));
  const input = uniqueWords.join(LOCALE_FEATURES[locale].separator);
  yield put(dictionarySlice.actions.changeInput(input));
  yield put(dictionarySlice.actions.submit());
}

function* onSolve(): AnyGenerator {
  const board = yield select(selectBoard);
  const { config } = yield select(selectConfig);
  const locale = yield select(selectLocale);
  const characters = yield select(selectCharacters);
  const isDuplicatCompletiv = yield select(selectIsDuplicatCompletiv);

  if (isDuplicatCompletiv) {
    yield* solveDrawsForRack(board, config, locale, characters);
    return;
  }

  yield put(drawsSlice.actions.reset());

  if (characters.length === 0) {
    yield put(solveSlice.actions.submitSuccess({ board, characters }));
    yield put(resultsSlice.actions.changeResults([]));
    return;
  }

  try {
    const results = yield call(solve, {
      board: board.toJson(),
      characters,
      game: config.game,
      locale,
    });
    yield put(resultsSlice.actions.changeResults(results));
    yield put(solveSlice.actions.submitSuccess({ board, characters }));
  } catch (error) {
    yield put(resultsSlice.actions.changeResults([]));
    yield put(solveSlice.actions.submitFailure(error));
  }
}

/**
 * The rack holds an unknown-draw marker, so instead of one solve there is one
 * per tile still in the bag. Results land in their own slice - the plain results
 * list has no column for "which draw made this possible".
 */
function* solveDrawsForRack(board: Board, config: ConfigJson, locale: Locale, characters: string[]): AnyGenerator {
  const candidates = yield select(selectDrawCandidates);

  yield put(resultsSlice.actions.changeResults([]));

  if (candidates.length === 0) {
    yield put(drawsSlice.actions.changeResults({ baseline: null, draws: [] }));
    yield put(solveSlice.actions.submitSuccess({ board, characters }));
    return;
  }

  try {
    const drawsResult = yield call(solveDraws, {
      board: board.toJson(),
      candidates,
      characters,
      game: config.game,
      locale,
    });

    // A newer sweep took over; it owns the results now.
    if (drawsResult) {
      yield put(drawsSlice.actions.changeResults(drawsResult));
      yield put(solveSlice.actions.submitSuccess({ board, characters }));
    }
  } catch (error) {
    yield put(drawsSlice.actions.reset());
    yield put(solveSlice.actions.submitFailure(error));
  }
}

function* onVerify(): AnyGenerator {
  yield delay(SUBMIT_DELAY);

  const board = yield select(selectBoard);
  const { config } = yield select(selectConfig);
  const locale = yield select(selectLocale);

  try {
    const { invalidWords, validWords } = yield call(verify, {
      board: board.toJson(),
      game: config.game,
      locale,
    });
    yield put(verifySlice.actions.submitSuccess({ board, invalidWords, validWords }));
  } catch (_error) {
    yield put(verifySlice.actions.submitFailure());
  }
}

function* resetRack(): AnyGenerator {
  const { config } = yield select(selectConfig);
  const rack = yield select(selectRack);

  if (config.rackSize > rack.length) {
    const differenceCount = Math.abs(config.rackSize - rack.length);
    yield put(rackSlice.actions.init([...rack, ...Array(differenceCount).fill(null)]));
  } else if (config.rackSize < rack.length) {
    const nonNulls = rack.filter(Boolean).slice(0, config.rackSize);
    const differenceCount = Math.abs(config.rackSize - nonNulls.length);
    const autoGroupTiles = yield select(selectLocaleAutoGroupTiles);
    yield put(rackSlice.actions.init([...nonNulls, ...Array(differenceCount).fill(null)]));
    yield put(rackSlice.actions.groupTiles(autoGroupTiles));
  }
}
