import os from 'os';
import path from 'path';

// bun test exposes the Jest globals to every module, so their presence marks a test run even under an inherited NODE_ENV
declare const describe: unknown;

// Serverless platforms (e.g. Vercel) expose a read-only filesystem except for `/tmp`, so file-based
// log transports crash the function. Redirect logs there when running on such a platform.
const BASE_DIRECTORY = process.env.VERCEL ? '/tmp' : os.homedir();

export const OUTPUT_DIRECTORY = path.resolve(BASE_DIRECTORY, '.scrabble-solver', 'logs');

export const EVENTS_FILEPATH = path.resolve(OUTPUT_DIRECTORY, 'events.txt');

export const CSV_DIRECTORY = path.resolve(BASE_DIRECTORY, '.scrabble-solver', 'csv');

export const IS_TEST_RUN = process.env.NODE_ENV === 'test' || typeof describe === 'function';
