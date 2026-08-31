/** First observation (prev === null) is the mount/focus pair; do not refetch. */
export function shouldRefreshOnResume(
  prevFocused: boolean | null,
  isFocused: boolean,
): boolean {
  return prevFocused === false && isFocused;
}

export function shouldRefreshOnAppResume(
  previousState: string,
  nextState: string,
  isFocused: boolean,
): boolean {
  return (
    isFocused &&
    (previousState === 'background' || previousState === 'inactive') &&
    nextState === 'active'
  );
}
