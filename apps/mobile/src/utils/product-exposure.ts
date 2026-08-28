export type ProductLayout = {
  y: number;
  height: number;
};

export type ProductViewport = {
  y: number;
  height: number;
};

const MIN_VISIBLE_RATIO = 0.5;

export class ProductExposureTracker {
  private readonly layouts = new Map<string, ProductLayout>();
  private readonly seenIds = new Set<string>();

  setLayout(productId: string, layout: ProductLayout): void {
    this.layouts.set(productId, layout);
  }

  retainProducts(productIds: readonly string[]): void {
    const retained = new Set(productIds);
    for (const productId of this.layouts.keys()) {
      if (!retained.has(productId)) {
        this.layouts.delete(productId);
      }
    }
  }

  resetSession(): void {
    this.seenIds.clear();
  }

  collectVisible(viewport: ProductViewport): string[] {
    if (viewport.height <= 0) {
      return [];
    }

    const viewportBottom = viewport.y + viewport.height;
    const visibleIds: string[] = [];
    for (const [productId, layout] of this.layouts) {
      if (this.seenIds.has(productId) || layout.height <= 0) {
        continue;
      }
      const visibleHeight = Math.max(
        0,
        Math.min(layout.y + layout.height, viewportBottom) -
          Math.max(layout.y, viewport.y),
      );
      if (visibleHeight / layout.height < MIN_VISIBLE_RATIO) {
        continue;
      }
      this.seenIds.add(productId);
      visibleIds.push(productId);
    }
    return visibleIds;
  }
}

export type ThrottledRunner = {
  run: () => void;
  cancel: () => void;
};

export function createThrottledRunner(
  callback: () => void,
  waitMs: number,
): ThrottledRunner {
  let lastRunAt = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const invoke = () => {
    lastRunAt = Date.now();
    callback();
  };

  return {
    run: () => {
      const remaining = waitMs - (Date.now() - lastRunAt);
      if (remaining <= 0) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        invoke();
        return;
      }
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke();
        }, remaining);
      }
    },
    cancel: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
