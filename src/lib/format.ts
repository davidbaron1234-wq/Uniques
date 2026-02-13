export function formatValue(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return `$${value.toLocaleString()}`;
}
