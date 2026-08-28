export function distributeWaterfallColumns<T>(
  items: T[],
  estimateHeight: (item: T) => number,
): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];
  let leftHeight = 0;
  let rightHeight = 0;

  for (const item of items) {
    const height = estimateHeight(item);
    if (leftHeight <= rightHeight) {
      left.push(item);
      leftHeight += height;
    } else {
      right.push(item);
      rightHeight += height;
    }
  }

  return [left, right];
}
