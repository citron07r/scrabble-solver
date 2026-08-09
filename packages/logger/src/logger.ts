import path from 'path';
import { createLogger, format, transports } from 'winston';

import { OUTPUT_DIRECTORY } from './constants';

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
    format.prettyPrint(),
  ),
  transports: process.env.VERCEL
    ? [
        // Serverless platforms capture stdout/stderr, so log everything to the console and avoid
        // file transports, which crash on the read-only filesystem. ANSI colors render as noise in
        // serverless log aggregators, so use plain output only.
        new transports.Console({
          format: format.simple(),
        }),
      ]
    : [
        new transports.File({
          filename: path.resolve(OUTPUT_DIRECTORY, 'error.log'),
          level: 'error',
        }),
        new transports.File({
          filename: path.resolve(OUTPUT_DIRECTORY, 'all.log'),
        }),
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
          level: 'error',
        }),
      ],
});
