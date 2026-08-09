import { http, https } from 'follow-redirects';
import fs from 'fs';
import path from 'path';

import { getTempFilepath } from './getTempFilepath';

export const downloadFile = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const tempFilepath = getTempFilepath();
    // Ensure the temp directory exists before writing; it is not guaranteed to be created by any
    // other package, and a missing directory triggers an unhandled `createWriteStream` error event.
    fs.mkdirSync(path.dirname(tempFilepath), { recursive: true });
    const protocol = url.startsWith('https') ? https : http;
    const writeStream = fs.createWriteStream(tempFilepath);

    // Without an `error` listener, a failed write (e.g. a read-only filesystem) emits an unhandled
    // `error` event that crashes the process instead of rejecting the promise.
    writeStream.on('error', (error) => {
      reject(error);
    });

    const request = protocol.get(url, (response) => {
      if (typeof response.statusCode === 'undefined' || response.statusCode >= 400) {
        reject(new Error(`Cannot download file: ${url}`));
        return;
      }

      response.on('error', (error) => {
        writeStream.close();
        reject(error);
      });

      response.on('end', () => {
        writeStream.on('finish', () => {
          writeStream.close();
          resolve(tempFilepath);
        });
      });

      response.pipe(writeStream);
    });

    request.on('error', (error) => {
      writeStream.close();
      reject(error);
    });
  });
};
