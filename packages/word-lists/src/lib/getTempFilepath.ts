import os from 'os';
import path from 'path';

import { getHash } from './getHash';

// Serverless platforms (e.g. Vercel) expose a read-only filesystem except for `/tmp`, so writes to
// the home directory crash the process. Redirect temporary downloads there when running on such a platform.
const BASE_DIRECTORY = process.env.VERCEL ? '/tmp' : os.homedir();

const OUTPUT_DIRECTORY = path.resolve(BASE_DIRECTORY, '.scrabble-solver');

export const getTempFilepath = (): string => {
  const filename = `${getHash()}.txt`;
  return path.join(OUTPUT_DIRECTORY, filename);
};
