import { shouldMirrorToConsole } from './logError';

describe('shouldMirrorToConsole', () => {
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    if (typeof originalVercel === 'undefined') {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  it('mirrors a warn-level event on Vercel', () => {
    process.env.VERCEL = '1';

    expect(shouldMirrorToConsole('warn')).toBe(true);
  });

  it('does not mirror a warn-level event off Vercel', () => {
    delete process.env.VERCEL;

    expect(shouldMirrorToConsole('warn')).toBe(false);
  });

  it('always mirrors an error-level event', () => {
    delete process.env.VERCEL;
    expect(shouldMirrorToConsole('error')).toBe(true);

    process.env.VERCEL = '1';
    expect(shouldMirrorToConsole('error')).toBe(true);
  });
});
