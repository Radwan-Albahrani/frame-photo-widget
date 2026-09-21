export function groupBy<T, K>(items: T[], keyOf: (item: T) => K | null): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (key === null) continue;
    const bucket = grouped.get(key);
    if (bucket === undefined) grouped.set(key, [item]);
    else bucket.push(item);
  }
  return grouped;
}
