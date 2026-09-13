import os from 'os';
import path from 'path';

export const DAY = 24 * 60 * 60 * 1000;

export const CACHE_STALE_THRESHOLD = DAY; // eslint-disable-line no-implicit-coercion

// Serverless platforms (e.g. Vercel) expose a read-only filesystem except for `/tmp`, so writes to
// the home directory crash the function. Redirect the cache there when running on such a platform.
const BASE_DIRECTORY = process.env.VERCEL ? '/tmp' : os.homedir();

export const OUTPUT_DIRECTORY = path.resolve(BASE_DIRECTORY, '.scrabble-solver', 'dictionaries');
