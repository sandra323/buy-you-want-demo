import { parseDatabaseUrl } from './parse-database-url';

describe('parseDatabaseUrl', () => {
  it('parses host, port, credentials, and database', () => {
    expect(
      parseDatabaseUrl('mysql://lightbuy:secret@localhost:3306/lightbuy'),
    ).toEqual({
      host: 'localhost',
      port: 3306,
      username: 'lightbuy',
      password: 'secret',
      database: 'lightbuy',
    });
  });

  it('defaults port to 3306', () => {
    expect(parseDatabaseUrl('mysql://u:p@dbhost/lightbuy').port).toBe(3306);
  });

  it('decodes special characters in the password', () => {
    expect(
      parseDatabaseUrl('mysql://u:p%40ss%3Aword@localhost:3306/lightbuy')
        .password,
    ).toBe('p@ss:word');
  });

  it('rejects non-mysql schemes', () => {
    expect(() => parseDatabaseUrl('postgres://u:p@localhost/db')).toThrow(
      'DATABASE_URL must use the mysql:// scheme',
    );
  });
});
