import { getConfig } from '@scrabble-solver/configs';
import { Board, Game, Locale } from '@scrabble-solver/types';

import { selectDrawCandidates, selectIsDuplicatCompletiv } from './selectors';
import type { RootState } from './types';

const config = getConfig(Game.Scrabble, Locale.EN_US);
const board = Board.create(config.boardWidth, config.boardHeight);

const createState = (game: Game): RootState =>
  ({
    board,
    rack: [],
    settings: { game, locale: Locale.EN_US },
  }) as unknown as RootState;

describe('selectIsDuplicatCompletiv', () => {
  it('is false for a regular Scrabble config', () => {
    expect(selectIsDuplicatCompletiv(createState(Game.Scrabble))).toBe(false);
  });

  it('is true only for the Duplicat Completiv game', () => {
    expect(selectIsDuplicatCompletiv(createState(Game.DuplicatCompletiv))).toBe(true);
  });
});

describe('selectDrawCandidates', () => {
  it('wires the remaining tiles derived from state into getDrawCandidates, offering every untouched letter', () => {
    const candidates = selectDrawCandidates(createState(Game.Scrabble));

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(({ isBlank }) => !isBlank)).toBe(true);
    expect(candidates.map(({ character }) => character)).toEqual(config.tiles.map((tile) => tile.character));
  });
});
