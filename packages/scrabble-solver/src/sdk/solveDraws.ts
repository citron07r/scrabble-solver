import { BLANK } from '@scrabble-solver/constants';
import { Board, Result, type ResultJson } from '@scrabble-solver/types';

import { pickBestDrawResult } from '@/lib';
import { solveDrawsLocally } from '@/solver-worker';
import { type DrawCandidate, type DrawsResult, type SolveDrawsRequestPayload } from '@/types';

import { fetchJson } from './fetchJson';

/**
 * The server has no draw-sweep endpoint, so the fallback path costs one request
 * per distinct drawn tile. Enough in flight to hide latency, few enough to stay
 * polite.
 */
const FALLBACK_CONCURRENCY = 6;

/**
 * Returns undefined when a newer sweep took over - the caller keeps whatever it
 * already shows rather than rendering an empty table.
 */
export const solveDraws = async (payload: SolveDrawsRequestPayload): Promise<DrawsResult | undefined> => {
  const local = await solveDrawsLocally(payload);

  if (local.outcome === 'cancelled') {
    return undefined;
  }

  const board = Board.fromJson(payload.board);

  if (local.outcome === 'answered') {
    const { baseline, draws } = local.data;

    return {
      baseline: toResult(baseline, board),
      draws: draws.map(({ result, ...candidate }) => ({ ...candidate, result: toResult(result, board) })),
    };
  }

  const resultsByCharacter = await solveOnServer(payload);

  return {
    baseline: toResult(pickHighestScoring(resultsByCharacter.get(NO_DRAW) ?? []), board),
    draws: payload.candidates.map((candidate) => {
      const results = resultsByCharacter.get(toDrawnCharacter(candidate)) ?? [];
      return { ...candidate, result: toResult(pickBestDrawResult(results, candidate, payload.characters), board) };
    }),
  };
};

/** Sentinel for the baseline request, which appends no drawn tile at all. */
const NO_DRAW = '';

/**
 * Every blank candidate shares one request: the rack is identical (fixed tiles
 * plus a blank) and the solver explores every letter the blank can spell.
 */
const solveOnServer = async (payload: SolveDrawsRequestPayload): Promise<Map<string, ResultJson[]>> => {
  const drawnCharacters = Array.from(new Set([NO_DRAW, ...payload.candidates.map(toDrawnCharacter)]));
  const resultsByCharacter = new Map<string, ResultJson[]>();
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < drawnCharacters.length) {
      const drawnCharacter = drawnCharacters[nextIndex++];
      resultsByCharacter.set(drawnCharacter, await fetchSolve(payload, drawnCharacter));
    }
  };

  await Promise.all(Array.from({ length: Math.min(FALLBACK_CONCURRENCY, drawnCharacters.length) }, worker));

  return resultsByCharacter;
};

const fetchSolve = (
  { board, characters, game, locale }: SolveDrawsRequestPayload,
  drawnCharacter: string,
): Promise<ResultJson[]> => {
  const drawnCharacters = drawnCharacter === NO_DRAW ? characters : [...characters, drawnCharacter];

  if (drawnCharacters.length === 0) {
    return Promise.resolve([]);
  }

  return fetchJson<ResultJson[]>('/api/solve', {
    method: 'POST',
    body: JSON.stringify({ board, characters: drawnCharacters, game, locale }),
  });
};

const pickHighestScoring = (results: ResultJson[]): ResultJson | null => {
  let best: ResultJson | null = null;

  for (const result of results) {
    if (!best || result.points > best.points) {
      best = result;
    }
  }

  return best;
};

const toResult = (json: ResultJson | null, board: Board): Result | null => {
  return json ? Result.fromJson(json, board) : null;
};

const toDrawnCharacter = ({ character, isBlank }: DrawCandidate): string => (isBlank ? BLANK : character);
