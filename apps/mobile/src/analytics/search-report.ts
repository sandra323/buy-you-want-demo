export function consumePendingSearchReport(input: {
  page: number;
  requestKeyword: string | null;
  pendingKeyword: string | null;
  resultCount: number;
  isFallback?: boolean;
}): {
  report: { query: string; resultCount: number } | null;
  nextPending: string | null;
} {
  if (
    input.page !== 1 ||
    !input.requestKeyword ||
    input.pendingKeyword !== input.requestKeyword
  ) {
    return { report: null, nextPending: input.pendingKeyword };
  }
  return {
    report: {
      query: input.requestKeyword,
      // Recommended substitutes are not keyword hits.
      resultCount: input.isFallback ? 0 : input.resultCount,
    },
    nextPending: null,
  };
}
