import { consumePendingSearchReport } from './search-report';

describe('consumePendingSearchReport', () => {
  it('reports only the first page that matches the pending keyword', () => {
    expect(
      consumePendingSearchReport({
        page: 2,
        requestKeyword: '手机',
        pendingKeyword: '手机',
        resultCount: 12,
      }).report,
    ).toBeNull();

    expect(
      consumePendingSearchReport({
        page: 1,
        requestKeyword: '旧词',
        pendingKeyword: '手机',
        resultCount: 22,
      }).report,
    ).toBeNull();

    const first = consumePendingSearchReport({
      page: 1,
      requestKeyword: '手机',
      pendingKeyword: '手机',
      resultCount: 3,
    });
    expect(first.report).toEqual({ query: '手机', resultCount: 3 });
    expect(first.nextPending).toBeNull();

    expect(
      consumePendingSearchReport({
        page: 1,
        requestKeyword: '手机',
        pendingKeyword: first.nextPending,
        resultCount: 3,
      }).report,
    ).toBeNull();
  });

  it('counts fallback recommendations as zero keyword hits', () => {
    expect(
      consumePendingSearchReport({
        page: 1,
        requestKeyword: 'zzz',
        pendingKeyword: 'zzz',
        resultCount: 22,
        isFallback: true,
      }).report,
    ).toEqual({ query: 'zzz', resultCount: 0 });
  });
});
