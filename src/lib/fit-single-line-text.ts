export const DEFAULT_MAX_TITLE_PX = 15;
export const DEFAULT_MIN_TITLE_PX = 7;

export function fitSingleLineFontSize({
  availableWidth,
  measuredWidth,
  maxFontSize = DEFAULT_MAX_TITLE_PX,
  minFontSize = DEFAULT_MIN_TITLE_PX
}: {
  availableWidth: number;
  measuredWidth: number;
  maxFontSize?: number;
  minFontSize?: number;
}) {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(measuredWidth)) return minFontSize;
  if (availableWidth <= 0 || measuredWidth <= 0) return minFontSize;
  if (measuredWidth <= availableWidth) return maxFontSize;
  const scaled = maxFontSize * (availableWidth / measuredWidth);
  return Math.max(minFontSize, Math.min(maxFontSize, Math.floor(scaled * 100) / 100));
}
