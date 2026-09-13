import { isError } from '@scrabble-solver/types';

export const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let response: Response;

  try {
    response = await window.fetch(input, init);
  } catch (error) {
    const message = isError(error) ? error.message : 'Unknown error';
    throw new Error(`Network error: ${message}`);
  }

  if (response.ok) {
    return response;
  }

  const json = await parseJsonSafely(response);

  if (isError(json)) {
    throw new Error(json.message);
  }

  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
};

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};
