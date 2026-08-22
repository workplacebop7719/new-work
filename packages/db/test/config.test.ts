import { describe, expect, it } from 'vitest';
import { assertSafeToDestroy } from '../src/config';

describe('db:reset-safe guard (A-19)', () => {
  it('allows a local development database', () => {
    expect(() =>
      assertSafeToDestroy({ url: 'postgres://localhost:5432/northstar_dev', environment: 'development' }),
    ).not.toThrow();
  });

  it('refuses when APP_ENV says production', () => {
    expect(() =>
      assertSafeToDestroy({ url: 'postgres://localhost:5432/northstar', environment: 'production' }),
    ).toThrow(/APP_ENV/);
  });

  it('refuses a remote host even when APP_ENV looks safe', () => {
    expect(() =>
      assertSafeToDestroy({
        url: 'postgres://user:pw@db.prod.example.com:5432/northstar',
        environment: 'development',
      }),
    ).toThrow(/Refusing/);
  });

  it('refuses an unparseable connection string rather than guessing', () => {
    expect(() => assertSafeToDestroy({ url: 'not a url', environment: 'development' })).toThrow(/parseable/);
  });
});
