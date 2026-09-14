import { afterAll, describe, expect, it } from 'bun:test';

import type * as fetchModule from './fetch';

let respond: () => Promise<Response> | Response = () => new Response('ok');

const globals = { window: (globalThis as { window?: unknown }).window };

Object.assign(globalThis, {
  window: { fetch: () => Promise.resolve(respond()) },
});

afterAll(() => {
  Object.assign(globalThis, globals);
});

const { fetch }: typeof fetchModule = await import('./fetch');

describe('fetch', () => {
  it('passes a successful response through unchanged', async () => {
    respond = () => new Response('ok', { status: 200 });
    const response = await fetch('/api/solve');

    expect(response.ok).toBe(true);
    expect(await response.text()).toBe('ok');
  });

  it('throws the message from a JSON error body', async () => {
    respond = () => new Response(JSON.stringify({ message: 'Invalid rack' }), { status: 400 });
    const failure = await fetch('/api/solve').catch((error: Error) => error.message);

    expect(failure).toBe('Invalid rack');
  });

  it('throws a generic HTTP status message for a non-JSON error body', async () => {
    respond = () => new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    const failure = await fetch('/api/solve').catch((error: Error) => error.message);

    expect(failure).toBe('HTTP 500: Internal Server Error');
  });
});
