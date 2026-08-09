import { BLANK } from '@scrabble-solver/constants';
import { type ResultJson } from '@scrabble-solver/types';

import { type DrawCandidate } from '@/types';

/**
 * The highest-scoring move that could not have been played without the drawn
 * tile. A move the fixed rack already affords says nothing about the draw, so it
 * is rejected even though the solver returns it.
 *
 * Ties keep the first result, preserving the solver's deterministic ordering.
 */
export const pickBestDrawResult = (
  results: ResultJson[],
  candidate: DrawCandidate,
  fixedCharacters: string[],
): ResultJson | null => {
  const fixedCount = countInRack(fixedCharacters, candidate);
  let best: ResultJson | null = null;

  for (const result of results) {
    if (countInResult(result, candidate) <= fixedCount) {
      continue;
    }

    if (!best || result.points > best.points) {
      best = result;
    }
  }

  return best;
};

const countInRack = (characters: string[], { character, isBlank }: DrawCandidate): number => {
  return characters.filter((rackCharacter) => rackCharacter === (isBlank ? BLANK : character)).length;
};

/**
 * A blank candidate is only relevant when a blank actually spells its letter -
 * the same solve returns blanks played as every other letter too.
 */
const countInResult = ({ blankIndices, tiles }: ResultJson, { character, isBlank }: DrawCandidate): number => {
  if (isBlank) {
    return blankIndices.some((index) => tiles[index] === character) ? blankIndices.length : 0;
  }

  return tiles.filter((tile, index) => tile === character && !blankIndices.includes(index)).length;
};
