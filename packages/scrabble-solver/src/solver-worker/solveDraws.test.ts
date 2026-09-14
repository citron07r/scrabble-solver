import { type Gaddag } from '@kamilmielnik/gaddag';
import { getConfig } from '@scrabble-solver/configs';
import { BLANK } from '@scrabble-solver/constants';
import { Board, Game, Locale, type ResultJson } from '@scrabble-solver/types';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { type DrawCandidate, type SolveDrawsRequestPayload, type SolveDrawsResultJson } from '../types';

import type * as solveDrawsModule from './solveDraws';

const solveCalls: string[][] = [];
let solveResult: (characters: string[]) => ResultJson[] = () => [];

await mock.module('@scrabble-solver/solver', () => ({
  solve: (_gaddag: unknown, _config: unknown, _board: unknown, tiles: { character: string }[]) => {
    const characters = tiles.map((tile) => tile.character);
    solveCalls.push(characters);
    return solveResult(characters);
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

const noYield = (): Promise<void> => Promise.resolve();

describe('solveDraws (solver-worker)', () => {
  beforeEach(() => {
    solveCalls.length = 0;
    solveResult = () => [];
  });

  it('solves once per non-blank candidate, once for every blank candidate combined, and once for the baseline', async () => {
    solveResult = (characters) => {
      if (characters.includes('t')) {
        return [createResultJson(['a', 't'], 9)];
      }

      if (characters.includes(BLANK)) {
        return [createResultJson(['a', 'z'], 7, [1])];
      }

      return [createResultJson(['a'], 5)];
    };

    const payload = createPayload({ candidates: [candidate('t'), candidate('z', true), candidate('q', true)] });
    const result: SolveDrawsResultJson | undefined = await solveDraws(
      {} as unknown as Gaddag,
      payload,
      () => false,
      noYield,
    );

    const blankSolves = solveCalls.filter((characters) => characters.includes(BLANK));
    expect(blankSolves).toHaveLength(1);
    expect(solveCalls).toHaveLength(3);

    const [tDraw, zDraw, qDraw] = result?.draws ?? [];
    expect(tDraw.results.map((res) => res.points)).toEqual([9]);
    expect(zDraw.results.map((res) => res.points)).toEqual([7]);
    expect(qDraw.results).toEqual([]);
    expect(result?.baseline?.points).toBe(5);
  });

  it('stops sweeping and skips the baseline once cancelled before the first candidate', async () => {
    const payload = createPayload({ candidates: [candidate('t'), candidate('a')] });
    const result: SolveDrawsResultJson | undefined = await solveDraws(
      {} as unknown as Gaddag,
      payload,
      () => true,
      noYield,
    );

    expect(result).toBeUndefined();
    expect(solveCalls).toHaveLength(0);
  });

  it('stops sweeping partway through, keeping only the candidates solved before cancellation', async () => {
    let calls = 0;
    const isCancelled = () => ++calls > 1;
    solveResult = () => [createResultJson(['a', 't'], 9)];

    const payload = createPayload({ candidates: [candidate('t'), candidate('a')] });
    const result: SolveDrawsResultJson | undefined = await solveDraws(
      {} as unknown as Gaddag,
      payload,
      isCancelled,
      noYield,
    );

    expect(result).toBeUndefined();
    expect(solveCalls).toHaveLength(1);
  });

  it('skips the baseline solve when the rack holds no fixed tiles', async () => {
    solveResult = () => [createResultJson(['t'], 9)];

    const payload = createPayload({ candidates: [candidate('t')], characters: [] });
    const result: SolveDrawsResultJson | undefined = await solveDraws(
      {} as unknown as Gaddag,
      payload,
      () => false,
      noYield,
    );

    expect(solveCalls).toHaveLength(1);
    expect(result?.baseline).toBeNull();
  });
});
