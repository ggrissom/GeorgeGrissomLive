export function calculateFittedFontSize({
  availableWidth,
  measuredWidth,
  maxFontSize,
  minFontSize = 1
}: {
  availableWidth: number;
  measuredWidth: number;
  maxFontSize: number;
  minFontSize?: number;
}) {
  if (
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(measuredWidth) ||
    !Number.isFinite(maxFontSize) ||
    availableWidth <= 0 ||
    measuredWidth <= 0 ||
    maxFontSize <= 0
  ) {
    return maxFontSize;
  }

  if (measuredWidth <= availableWidth) return maxFontSize;

  return Math.max(minFontSize, Math.min(maxFontSize, maxFontSize * (availableWidth / measuredWidth)));
}
