import { Game } from '@scrabble-solver/types';

import { scrabble } from './scrabble';

/**
 * Six fixed tiles; the seventh is not held but drawn. The rack holds only the
 * six, and the solver supplies the seventh from the bag - once per tile that
 * could still come out of it.
 *
 * `maximumWordLength: 7` covers the drawn tile: it raises the placement cap to
 * seven and moves the bingo there, so a full seven-tile play still scores one
 * even though the rack itself is six.
 */
export const duplicatCompletiv = {
  ...scrabble,
  game: Game.DuplicatCompletiv,
  maximumWordLength: 7,
  name: 'Duplicat Completiv',
  rackSize: 6,
};
