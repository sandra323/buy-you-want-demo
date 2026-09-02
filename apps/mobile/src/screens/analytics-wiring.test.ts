import { readFileSync } from 'fs';
import { join } from 'path';

function source(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

describe('analytics call-site wiring', () => {
  it('fires login_success after password login and register persist', () => {
    expect(source('LoginScreen.tsx')).toContain(
      "trackLoginSucceeded('password')",
    );
    expect(source('RegisterScreen.tsx')).toContain(
      "trackLoginSucceeded('password')",
    );
    expect(source('../auth/hydrate.ts')).toContain(
      "trackLoginSucceeded('silent')",
    );
  });

  it('reports search only from the first-page request helper', () => {
    expect(source('SearchScreen.tsx')).toContain(
      'trackSearch(report.query, report.resultCount)',
    );
    expect(source('SearchScreen.tsx')).toContain('consumePendingSearchReport');
    expect(source('SearchScreen.tsx')).toContain('isFallback: data.isFallback');
    expect(source('SearchScreen.tsx')).toContain(
      'setSearchRequestId((requestId) => requestId + 1)',
    );
    expect(source('SearchScreen.tsx')).not.toMatch(
      /trackSearch\(\s*keyword\s*\)/,
    );
  });
});
