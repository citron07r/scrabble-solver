import { BLANK } from '@scrabble-solver/constants';
import { type ResultJson } from '@scrabble-solver/types';

import { type DrawCandidate } from '../types';

import { pickBestDrawResults } from './pickBestDrawResults';

const createResult = (tiles: string[], points: number, blankIndices: number[] = []): ResultJson => ({
  blankIndices,
  id: 0,
  isHorizontal: true,
  points,
  tiles,
  x: 0,
  y: 0,
});

const drawn: DrawCandidate = { character: 't', isBlank: false, remainingCount: 6 };
const drawnBlank: DrawCandidate = { character: 'z', isBlank: true, remainingCount: 0 };

describe('pickBestDrawResults', () => {
  it('picks the highest-scoring move that places the drawn tile', () => {
    const results = [createResult(['t'], 10), createResult(['a', 't'], 30), createResult(['t'], 20)];
    expect(pickBestDrawResults(results, drawn, ['a']).map((result) => result.points)).toEqual([30]);
  });

  it('rejects a move that does not place the drawn tile', () => {
    expect(pickBestDrawResults([createResult(['a', 'e'], 99)], drawn, ['a', 'e'])).toEqual([]);
  });

  it('rejects a move the fixed rack already affords', () => {
    // The rack holds a t; a move placing one t needs no draw.
    expect(pickBestDrawResults([createResult(['t'], 50)], drawn, ['t'])).toEqual([]);
  });

  it('accepts a move that places more copies than the fixed rack holds', () => {
    expect(pickBestDrawResults([createResult(['t', 't'], 50)], drawn, ['t']).map((result) => result.points)).toEqual([
      50,
    ]);
  });

  it('does not count a blank-played letter as the drawn letter tile', () => {
    expect(pickBestDrawResults([createResult(['t'], 50, [0])], drawn, [])).toEqual([]);
  });

  it('accepts a blank candidate only when a blank spells its letter', () => {
    const spellsZ = createResult(['z'], 40, [0]);
    const spellsE = createResult(['e'], 80, [0]);
    expect(pickBestDrawResults([spellsE, spellsZ], drawnBlank, []).map((result) => result.points)).toEqual([40]);
  });

  it('rejects a blank candidate the fixed rack could already play', () => {
    expect(pickBestDrawResults([createResult(['z'], 40, [0])], drawnBlank, [BLANK])).toEqual([]);
  });

  it('accepts a second blank beyond the one the fixed rack holds', () => {
    const twoBlanks = createResult(['z', 'e'], 40, [0, 1]);
    expect(pickBestDrawResults([twoBlanks], drawnBlank, [BLANK]).map((result) => result.points)).toEqual([40]);
  });

  it('keeps every move tied on the top score, in solver order', () => {
    const first = createResult(['t'], 30);
    const second = createResult(['t', 'a'], 30);
    const lower = createResult(['t'], 10);
    expect(pickBestDrawResults([first, lower, second], drawn, [])).toEqual([first, second]);
  });

  it('drops lower-scoring moves once a better one appears', () => {
    const lower = createResult(['t'], 10);
    const higher = createResult(['t', 'a'], 40);
    expect(pickBestDrawResults([lower, higher], drawn, [])).toEqual([higher]);
  });

  it('returns nothing for no results', () => {
    expect(pickBestDrawResults([], drawn, [])).toEqual([]);
  });
});
