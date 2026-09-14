import { getConfig } from '@scrabble-solver/configs';
import { Board, Game, Locale, Result, type ResultJson } from '@scrabble-solver/types';

import { type DrawCandidate, type DrawResult, type DrawRow } from '../../types';
import type { RootState } from '../types';

import { selectDrawRows } from './selectors';
import type { DrawsState } from './types';

const config = getConfig(Game.Scrabble, Locale.EN_US);
const board = Board.create(config.boardWidth, config.boardHeight);

const createResultJson = (points: number): ResultJson => ({
  blankIndices: [],
  id: 0,
  isHorizontal: true,
  points,
  tiles: ['a', 'b'],
  x: 0,
  y: 0,
});

const createResult = (points: number): Result => Result.fromJson(createResultJson(points), board);

const candidate: DrawCandidate = { character: 't', isBlank: false, remainingCount: 5 };

const createState = (results: DrawResult[] | undefined): RootState =>
  ({
    draws: { baseline: null, results } as DrawsState,
    settings: { showCoordinates: 'original' },
  }) as unknown as RootState;

describe('selectDrawRows', () => {
  it('returns undefined when there is no draw sweep to show', () => {
    expect(selectDrawRows(createState(undefined))).toBeUndefined();
  });

  it('gives a candidate that enables nothing a single row with a null result', () => {
    const rows: DrawRow[] | undefined = selectDrawRows(createState([{ ...candidate, results: [] }]));

    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toMatchObject({ ...candidate, coordinates: '', result: null });
  });

  it('creates one row per move tied on the top score for a candidate', () => {
    const tiedFirst = createResult(30);
    const tiedSecond = createResult(30);
    const rows: DrawRow[] | undefined = selectDrawRows(
      createState([{ ...candidate, results: [tiedFirst, tiedSecond] }]),
    );

    expect(rows).toHaveLength(2);
    expect(rows?.every((row) => row.character === candidate.character)).toBe(true);
    expect(rows?.map((row) => row.result)).toEqual([tiedFirst, tiedSecond]);
  });

  it('sorts rows by score descending, treating a candidate with no result as scoring below zero', () => {
    const rows: DrawRow[] | undefined = selectDrawRows(
      createState([
        { ...candidate, character: 'z', results: [] },
        { ...candidate, character: 'a', results: [createResult(0)] },
      ]),
    );

    expect(rows?.map((row) => row.character)).toEqual(['a', 'z']);
  });
});
