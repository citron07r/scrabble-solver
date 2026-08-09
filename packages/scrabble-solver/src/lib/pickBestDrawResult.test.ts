import { BLANK } from '@scrabble-solver/constants';
import { type ResultJson } from '@scrabble-solver/types';

import { type DrawCandidate } from '../types';

import { pickBestDrawResult } from './pickBestDrawResult';

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

describe('pickBestDrawResult', () => {
  it('picks the highest-scoring move that places the drawn tile', () => {
    const results = [createResult(['t'], 10), createResult(['a', 't'], 30), createResult(['t'], 20)];
    expect(pickBestDrawResult(results, drawn, ['a'])?.points).toBe(30);
  });

  it('rejects a move that does not place the drawn tile', () => {
    expect(pickBestDrawResult([createResult(['a', 'e'], 99)], drawn, ['a', 'e'])).toBeNull();
  });

  it('rejects a move the fixed rack already affords', () => {
    // The rack holds a t; a move placing one t needs no draw.
    expect(pickBestDrawResult([createResult(['t'], 50)], drawn, ['t'])).toBeNull();
  });

  it('accepts a move that places more copies than the fixed rack holds', () => {
    expect(pickBestDrawResult([createResult(['t', 't'], 50)], drawn, ['t'])?.points).toBe(50);
  });

  it('does not count a blank-played letter as the drawn letter tile', () => {
    expect(pickBestDrawResult([createResult(['t'], 50, [0])], drawn, [])).toBeNull();
  });

  it('accepts a blank candidate only when a blank spells its letter', () => {
    const spellsZ = createResult(['z'], 40, [0]);
    const spellsE = createResult(['e'], 80, [0]);
    expect(pickBestDrawResult([spellsE, spellsZ], drawnBlank, [])?.points).toBe(40);
  });

  it('rejects a blank candidate the fixed rack could already play', () => {
    expect(pickBestDrawResult([createResult(['z'], 40, [0])], drawnBlank, [BLANK])).toBeNull();
  });

  it('accepts a second blank beyond the one the fixed rack holds', () => {
    const twoBlanks = createResult(['z', 'e'], 40, [0, 1]);
    expect(pickBestDrawResult([twoBlanks], drawnBlank, [BLANK])?.points).toBe(40);
  });

  it('keeps the first result on a points tie, preserving solver ordering', () => {
    const first = createResult(['t'], 30);
    const second = createResult(['t', 'a'], 30);
    expect(pickBestDrawResult([first, second], drawn, [])).toBe(first);
  });

  it('returns null for no results', () => {
    expect(pickBestDrawResult([], drawn, [])).toBeNull();
  });
});
