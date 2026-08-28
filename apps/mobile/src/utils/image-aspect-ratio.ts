const cache = new Map<string, number>();

/** Parse width/height from common CDN paths (e.g. picsum `/400/440`). */
export function parseAspectRatioFromUrl(url: string): number | undefined {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i >= 1; i -= 1) {
      const height = Number(segments[i]);
      const width = Number(segments[i - 1]);
      if (
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0 &&
        width <= 10000 &&
        height <= 10000
      ) {
        return height / width;
      }
    }
  } catch {
    // ignore malformed URLs
  }
  return undefined;
}

export function getImageAspectRatio(uri: string): number {
  const cached = cache.get(uri);
  if (cached !== undefined) {
    return cached;
  }
  const parsed = parseAspectRatioFromUrl(uri);
  const ratio = parsed ?? 1;
  cache.set(uri, ratio);
  return ratio;
}

/** Returns true when the cache value changed (layout should reflow). */
export function updateImageAspectRatio(uri: string, ratio: number): boolean {
  const prev = cache.get(uri);
  if (prev !== undefined && Math.abs(prev - ratio) < 0.01) {
    return false;
  }
  cache.set(uri, ratio);
  return true;
}
