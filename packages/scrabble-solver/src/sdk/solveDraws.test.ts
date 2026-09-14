import { getConfig } from '@scrabble-solver/configs';
import { BLANK } from '@scrabble-solver/constants';
import { Board, Game, Locale, type ResultJson } from '@scrabble-solver/types';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import {
  type DrawCandidate,
  type DrawsResult,
  type SolveDrawsRequestPayload,
  type SolveDrawsResultJson,
} from '../types';

import type * as solveDrawsModule from './solveDraws';

type LocalOutcome =
  | { outcome: 'answered'; data: SolveDrawsResultJson }
  | { outcome: 'cancelled' }
  | { outcome: 'unavailable' };

const fetchCalls: { characters: string[] }[] = [];
let localOutcome: LocalOutcome = { outcome: 'unavailable' };
let respondWith: (characters: string[]) => ResultJson[] = () => [];

await mock.module('../solver-worker', () => ({
  solveDrawsLocally: () => Promise.resolve(localOutcome),
}));

await mock.module('./fetchJson', () => ({
  fetchJson: (_input: string, init: { body: string }) => {
    const { characters } = JSON.parse(init.body) as { characters: string[] };
    fetchCalls.push({ characters });
    return Promise.resolve(respondWith(characters));
  },
}));

const { solveDraws }: typeof solveDrawsModule = await import('./solveDraws');

const config = getConfig(Game.Scrabble, Locale.EN_US);
const board = Board.create(config.boardWidth, config.boardHeight).toJson();

const createResultJson = (tiles: string[], points: number, blankIndices: number[] = []): ResultJson => ({
  blankIndices,
  id: 0,
  isHorizontal: true,
  points,
  tiles,
  x: 0,
  y: 0,
});

const candidate = (character: string, isBlank = false): DrawCandidate => ({ character, isBlank, remainingCount: 1 });

const createPayload = (overrides: Partial<SolveDrawsRequestPayload> = {}): SolveDrawsRequestPayload => ({
  board,
  candidates: [],
  characters: ['a'],
  game: Game.Scrabble,
  locale: Locale.EN_US,
  ...overrides,
});

describe('solveDraws (sdk)', () => {
  beforeEach(() => {
    fetchCalls.length = 0;
    localOutcome = { outcome: 'unavailable' };
    respondWith = () => [];
  });

  it('returns undefined when the local sweep was cancelled, without hitting the server', async () => {
    localOutcome = { outcome: 'cancelled' };

    const result: DrawsResult | undefined = await solveDraws(createPayload({ candidates: [candidate('t')] }));

    expect(result).toBeUndefined();
    expect(fetchCalls).toHaveLength(0);
  });

  it('converts the local worker answer to Result instances without falling back to the server', async () => {
    localOutcome = {
      data: {
        baseline: createResultJson(['a'], 5),
        draws: [{ ...candidate('t'), results: [createResultJson(['a', 't'], 9)] }],
      },
      outcome: 'answered',
    };

    const result: DrawsResult | undefined = await solveDraws(createPayload({ candidates: [candidate('t')] }));

    expect(result?.baseline?.points).toBe(5);
    expect(result?.draws[0].results[0].points).toBe(9);
    expect(fetchCalls).toHaveLength(0);
  });

  it('falls back to the server, requesting the baseline without appending a drawn tile', async () => {
    respondWith = (characters) => (characters.length === 1 ? [createResultJson(['a'], 5)] : []);

    const result: DrawsResult | undefined = await solveDraws(createPayload({ candidates: [] }));

    expect(fetchCalls).toEqual([{ characters: ['a'] }]);
    expect(result?.baseline?.points).toBe(5);
  });

  it('shares one request across every blank candidate, filtering the shared results per candidate', async () => {
    respondWith = (characters) =>
      characters.includes(BLANK) ? [createResultJson(['a', 'z'], 7, [1])] : [createResultJson(['a'], 5)];

    const result: DrawsResult | undefined = await solveDraws(
      createPayload({ candidates: [candidate('z', true), candidate('q', true)] }),
    );

    const blankRequests = fetchCalls.filter((call) => call.characters.includes(BLANK));
    expect(blankRequests).toHaveLength(1);

    const [zDraw, qDraw] = result?.draws ?? [];
    expect(zDraw.results.map((zResult) => zResult.points)).toEqual([7]);
    expect(qDraw.results).toEqual([]);
  });

  it('issues one request per distinct drawn character even beyond the concurrency limit', async () => {
    const letters = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    respondWith = (characters) => {
      const drawn = characters[characters.length - 1];
      return characters.length === 1 ? [] : [createResultJson(['a', drawn], 10)];
    };

    const result: DrawsResult | undefined = await solveDraws(
      createPayload({ candidates: letters.map((letter) => candidate(letter)) }),
    );

    expect(fetchCalls).toHaveLength(letters.length + 1);
    expect(new Set(fetchCalls.map((call) => call.characters.join(','))).size).toBe(letters.length + 1);
    expect(result?.draws.every((draw) => draw.results.length === 1)).toBe(true);
  });

  it('resolves a request for no tiles without calling the server', async () => {
    const result: DrawsResult | undefined = await solveDraws(createPayload({ candidates: [], characters: [] }));

    expect(fetchCalls).toHaveLength(0);
    expect(result?.baseline).toBeNull();
  });

  it("degrades one candidate's request failure to empty results instead of discarding the whole sweep", async () => {
    respondWith = (characters) => {
      const drawn = characters[characters.length - 1];

      if (drawn === 'x') {
        throw new Error('simulated network failure');
      }

      return characters.length === 1 ? [] : [createResultJson(['a', drawn], 10)];
    };

    const result: DrawsResult | undefined = await solveDraws(
      createPayload({ candidates: [candidate('x'), candidate('y')] }),
    );

    expect(result).toBeDefined();

    const [xDraw, yDraw] = result?.draws ?? [];
    expect(xDraw.results).toEqual([]);
    expect(yDraw.results.map((yResult) => yResult.points)).toEqual([10]);
  });
});
