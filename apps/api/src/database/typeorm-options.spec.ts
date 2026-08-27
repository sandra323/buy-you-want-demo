import {
  buildTypeOrmOptions,
  isTypeOrmSynchronizeEnabled,
} from './typeorm-options';

describe('TypeORM synchronize gate', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSync = process.env.TYPEORM_SYNC;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL =
      'mysql://lightbuy:lightbuy@localhost:3306/lightbuy';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSync === undefined) {
      delete process.env.TYPEORM_SYNC;
    } else {
      process.env.TYPEORM_SYNC = originalSync;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('keeps synchronize off in production even when TYPEORM_SYNC=1', () => {
    process.env.NODE_ENV = 'production';
    process.env.TYPEORM_SYNC = '1';

    expect(isTypeOrmSynchronizeEnabled()).toBe(false);
    expect(buildTypeOrmOptions(true).synchronize).toBe(false);
  });

  it('keeps synchronize off in development without TYPEORM_SYNC=1', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.TYPEORM_SYNC;

    expect(isTypeOrmSynchronizeEnabled()).toBe(false);
    expect(buildTypeOrmOptions(true).synchronize).toBe(false);
  });

  it('enables synchronize only in development with TYPEORM_SYNC=1', () => {
    process.env.NODE_ENV = 'development';
    process.env.TYPEORM_SYNC = '1';

    expect(isTypeOrmSynchronizeEnabled()).toBe(true);
    expect(buildTypeOrmOptions(true).synchronize).toBe(true);
  });

  it('uses compiled js globs when isCompiled is true', () => {
    const options = buildTypeOrmOptions(true);
    expect(JSON.stringify(options.migrations)).toMatch(/\.js"/);
    expect(JSON.stringify(options.entities)).toMatch(/\.entity\.js"/);
  });

  it('uses TypeScript globs when isCompiled is false', () => {
    const options = buildTypeOrmOptions(false);
    expect(JSON.stringify(options.migrations)).toMatch(/\.ts"/);
    expect(JSON.stringify(options.entities)).toMatch(/\.entity\.ts"/);
  });
});
