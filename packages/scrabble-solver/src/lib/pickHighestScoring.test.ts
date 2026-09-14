import { type ResultJson } from '@scrabble-solver/types';

import { pickHighestScoring } from './pickHighestScoring';

const createResult = (points: number): ResultJson => ({
  blankIndices: [],
  id: 0,
  isHorizontal: true,
  points,
  tiles: ['a'],
  x: 0,
  y: 0,
});

describe('pickHighestScoring', () => {
  it('returns null for no results', () => {
    expect(pickHighestScoring([])).toBeNull();
  });

  it('returns the only result when there is just one', () => {
    const only = createResult(10);
    expect(pickHighestScoring([only])).toBe(only);
  });

  it('picks the highest-scoring result out of several', () => {
    const low = createResult(10);
    const high = createResult(40);
    const middle = createResult(20);
    expect(pickHighestScoring([low, high, middle])).toBe(high);
  });

  it('keeps the first result seen when several tie on the top score', () => {
    const first = createResult(30);
    const second = createResult(30);
    expect(pickHighestScoring([first, second])).toBe(first);
  });
});
