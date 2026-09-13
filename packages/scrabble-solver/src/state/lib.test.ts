import { getConfig } from '@scrabble-solver/configs';
import { BLANK } from '@scrabble-solver/constants';
import { Board, type Config, Game, Locale } from '@scrabble-solver/types';

import { type RemainingTile } from '../types';

import { getDrawCandidates, getRemainingTiles } from './lib';

const config = getConfig(Game.Scrabble, Locale.EN_GB);
const locale = Locale.EN_GB;

const emptyBoard = (): Board => Board.create(config.boardWidth, config.boardHeight);

const findTile = (tiles: RemainingTile[], character: string): RemainingTile => {
  const tile = tiles.find((remainingTile) => remainingTile.character === character);

  if (!tile) {
    throw new Error(`No remaining tile for "${character}"`);
  }

  return tile;
};

describe('getRemainingTiles', () => {
  it('counts rack letters as used', () => {
    const tiles = getRemainingTiles(config, emptyBoard(), ['a', 'a'], locale);
    expect(findTile(tiles, 'a').usedCount).toBe(2);
  });
});

describe('getDrawCandidates', () => {
  const createRemainingTiles = (overrides: Partial<Record<string, number>>, blanksLeft: number): RemainingTile[] => {
    const tiles: RemainingTile[] = config.tiles.map(({ character, count, score }) => ({
      character,
      count,
      score,
      usedCount: overrides[character] ?? 0,
    }));

    return [
      ...tiles,
      { character: BLANK, count: config.blanksCount, score: 0, usedCount: config.blanksCount - blanksLeft },
    ];
  };

  it('offers every letter with copies left in the bag', () => {
    const candidates = getDrawCandidates(config, createRemainingTiles({}, 2));
    expect(candidates.every(({ isBlank }) => !isBlank)).toBe(true);
    expect(candidates.map(({ character }) => character)).toEqual(config.tiles.map(({ character }) => character));
  });

  it('reports how many copies of a letter are left', () => {
    const { count = 0 } = config.tiles.find((tile) => tile.character === 'z') ?? {};
    const candidates = getDrawCandidates(config, createRemainingTiles({ z: 0 }, 0));
    expect(candidates.find(({ character }) => character === 'z')?.remainingCount).toBe(count);
  });

  it('offers an exhausted letter as a blank while a blank is left', () => {
    const zCount = config.tiles.find((tile) => tile.character === 'z')?.count ?? 0;
    const candidates = getDrawCandidates(config, createRemainingTiles({ z: zCount }, 1));
    expect(candidates.find(({ character }) => character === 'z')).toEqual({
      character: 'z',
      isBlank: true,
      remainingCount: 0,
    });
  });

  it('drops an exhausted letter entirely once no blank is left', () => {
    const zCount = config.tiles.find((tile) => tile.character === 'z')?.count ?? 0;
    const candidates = getDrawCandidates(config, createRemainingTiles({ z: zCount }, 0));
    expect(candidates.some(({ character }) => character === 'z')).toBe(false);
  });

  it('never offers the blank itself as a candidate', () => {
    const candidates = getDrawCandidates(config, createRemainingTiles({}, 2));
    expect(candidates.some(({ character }) => character === BLANK)).toBe(false);
  });

  it('returns nothing for a config without tile counts', () => {
    const countlessConfig = {
      hasCharacter: () => true,
      supportsRemainingTiles: false,
    } as unknown as Config;

    expect(getDrawCandidates(countlessConfig, createRemainingTiles({}, 2))).toEqual([]);
  });
});

describe('Duplicat Completiv config', () => {
  const duplicatCompletiv = getConfig(Game.DuplicatCompletiv, Locale.EN_GB);
  const scrabble = getConfig(Game.Scrabble, Locale.EN_GB);

  it('holds only the six fixed tiles', () => {
    expect(duplicatCompletiv.rackSize).toBe(6);
  });

  /**
   * The drawn seventh tile is never on the rack, so the placement cap and the
   * bingo threshold both have to sit above rackSize for it to count.
   */
  it('allows a seventh tile to be placed and to score a bingo', () => {
    expect(duplicatCompletiv.maximumWordLength).toBe(7);
  });

  it('keeps the standard board and tile distribution', () => {
    expect(duplicatCompletiv.boardWidth).toBe(scrabble.boardWidth);
    expect(duplicatCompletiv.boardHeight).toBe(scrabble.boardHeight);
    expect(duplicatCompletiv.tiles).toEqual(scrabble.tiles);
    expect(duplicatCompletiv.blanksCount).toBe(scrabble.blanksCount);
  });

  it('tracks tile counts, without which there is no bag to draw from', () => {
    expect(duplicatCompletiv.supportsRemainingTiles).toBe(true);
  });

  it('leaves Duplicat Eliptic alone', () => {
    const duplicatEliptic = getConfig(Game.DuplicatEliptic, Locale.EN_GB);
    expect(duplicatEliptic.rackSize).toBe(8);
    expect(duplicatEliptic.maximumWordLength).toBe(7);
    expect(scrabble.rackSize).toBe(7);
  });

  it('exists for every locale that has Scrabble', () => {
    const locales = [
      Locale.DE_DE,
      Locale.EN_GB,
      Locale.EN_US,
      Locale.ES_ES,
      Locale.FA_IR,
      Locale.FR_FR,
      Locale.PL_PL,
      Locale.RO_RO,
      Locale.TR_TR,
    ];
    expect(locales.map((value) => getConfig(Game.DuplicatCompletiv, value).locale)).toEqual(locales);
  });
});
