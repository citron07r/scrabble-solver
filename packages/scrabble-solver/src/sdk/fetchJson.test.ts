import { afterAll, describe, expect, it } from 'bun:test';

import type * as fetchJsonModule from './fetchJson';

let respond: () => Promise<Response> | Response = () => new Response('{}');

const globals = { window: (globalThis as { window?: unknown }).window };

Object.assign(globalThis, {
  window: { fetch: () => Promise.resolve(respond()) },
});

afterAll(() => {
  Object.assign(globalThis, globals);
});

const { fetchJson }: typeof fetchJsonModule = await import('./fetchJson');

describe('fetchJson', () => {
  it('resolves to the parsed body of a successful JSON response', async () => {
    respond = () => new Response(JSON.stringify({ locale: 'en-US' }), { status: 200 });
    const body = await fetchJson('/api/solve');

    expect(body).toEqual({ locale: 'en-US' });
  });

  it('throws when a success-status body is not JSON', async () => {
    respond = () => new Response('not json', { status: 200 });
    const failure = await fetchJson('/api/solve').catch((error: Error) => error.message);

    expect(failure).toBe('Invalid JSON response');
  });
});
