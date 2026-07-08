import os from 'os';
import path from 'path';

// Serverless platforms (e.g. Vercel) expose a read-only filesystem except for `/tmp`, so file-based
// log transports crash the function. Redirect logs there when running on such a platform.
const BASE_DIRECTORY = process.env.VERCEL ? '/tmp' : os.homedir();

export const OUTPUT_DIRECTORY = path.resolve(BASE_DIRECTORY, '.scrabble-solver', 'logs');
