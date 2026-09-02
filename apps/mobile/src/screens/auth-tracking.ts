export function canTrackAuthClick(...errors: (string | undefined)[]): boolean {
  return errors.every((error) => error === undefined);
}
