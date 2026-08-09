import { Game } from '@scrabble-solver/types';

import { scrabble } from './scrabble';

export const duplicatEliptic = {
  ...scrabble,
  game: Game.DuplicatEliptic,
  name: 'Duplicat Eliptic',
  rackSize: 8,
  maximumWordLength: 7,
};
