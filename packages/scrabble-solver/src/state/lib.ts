import { BLANK } from '@scrabble-solver/constants';
import { type Board, type Config } from '@scrabble-solver/types';

import { createKeyComparator } from '@/lib';

// Relative rather than aliased: colocated tests are excluded from this package's
// tsconfig, so the linter resolves them without the "@/*" paths.
import { type DrawCandidate, type RemainingTile } from '../types';

export const getRemainingTiles = (
  config: Config,
  board: Board,
  characters: string[],
  locale: string,
): RemainingTile[] => {
  const nonEmptyCells = board.rows.flat().filter((cell) => !cell.isEmpty);
  const letterCells = nonEmptyCells.filter((cell) => !cell.tile.isBlank);
  const remainingTiles = Object.fromEntries(config.tiles.map((tile) => [tile.character, { ...tile, usedCount: 0 }]));
  const blank: RemainingTile = {
    character: BLANK,
    count: config.blanksCount,
    score: config.blankScore,
    usedCount:
      nonEmptyCells.filter((cell) => cell.tile.isBlank).length +
      characters.filter((character) => character === BLANK).length,
  };
  const letters = [
    ...letterCells.map((cell) => cell.tile.character),
    ...characters.filter((letter) => letter !== BLANK),
  ];
  const unknownLetters = letters.filter((letter) => typeof remainingTiles[letter] === 'undefined');

  for (const letter of unknownLetters) {
    remainingTiles[letter] = {
      character: letter,
      count: 0,
      score: 0,
      usedCount: 0,
    };
  }

  for (const letter of letters) {
    ++remainingTiles[letter].usedCount;
  }

  const comparator = createKeyComparator('character', locale);

  return [...Object.values(remainingTiles).sort(comparator), blank];
};

/**
 * Every tile that could fill the unknown rack slot. A letter with copies left in
 * the bag is a candidate as itself; a letter with none left is a candidate only
 * while a blank remains, and is then played by that blank for 0 points.
 */
export const getDrawCandidates = (config: Config, remainingTiles: RemainingTile[]): DrawCandidate[] => {
  if (!config.supportsRemainingTiles) {
    return [];
  }

  const blank = remainingTiles.find((tile) => tile.character === BLANK);
  const hasBlank = getRemainingCount(blank) > 0;
  const candidates: DrawCandidate[] = [];

  for (const tile of remainingTiles) {
    if (tile.character === BLANK || !config.hasCharacter(tile.character)) {
      continue;
    }

    const remainingCount = getRemainingCount(tile);

    if (remainingCount > 0) {
      candidates.push({ character: tile.character, isBlank: false, remainingCount });
    } else if (hasBlank) {
      candidates.push({ character: tile.character, isBlank: true, remainingCount: 0 });
    }
  }

  return candidates;
};

const getRemainingCount = (tile: RemainingTile | undefined): number => {
  return tile ? Math.max((tile.count ?? 0) - tile.usedCount, 0) : 0;
};
