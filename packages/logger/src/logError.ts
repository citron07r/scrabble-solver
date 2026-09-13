import { IS_TEST_RUN } from './constants';
import { describeError, type ErrorDescription } from './describeError';
import { type EventOf, type Operation } from './events';
import { logEvent } from './logEvent';

type ErrorContext = Partial<Pick<EventOf<'error'>, 'level' | 'input' | 'ip' | 'locale' | 'ua'>>;

export function logError(
  operation: Operation,
  error: unknown,
  { level = 'error', ...context }: ErrorContext = {},
): void {
  const description = describeError(error);
  logEvent({ type: 'error', level, operation, ...description, ...context });

  if (!IS_TEST_RUN && shouldMirrorToConsole(level)) {
    process.stderr.write(formatStderrEntry(operation, description));
  }
}

/**
 * Serverless platforms (e.g. Vercel) capture stdout/stderr but redirect the
 * event file to `/tmp`, which is ephemeral per-invocation and never read - so
 * a warn-level event written only to the file is effectively invisible there.
 * Mirror every level to stderr on Vercel; everywhere else, keep mirroring only
 * errors so local/CI output stays exactly as noisy as today.
 */
export function shouldMirrorToConsole(level: EventOf<'error'>['level']): boolean {
  return level === 'error' || Boolean(process.env.VERCEL);
}

function formatStderrEntry(operation: Operation, { message, stack }: ErrorDescription): string {
  const frames = stack?.split('\n').filter((line) => line.startsWith('    at ')) ?? [];
  return `${[`${operation}: ${message}`, ...frames].join('\n')}\n`;
}
