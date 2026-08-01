export type TouchPoint = {
  x: number;
  y: number;
};

export type TouchPageGesture = {
  pageDelta: -1 | 0 | 1;
  suppressClick: boolean;
};

const TOUCH_SWIPE_THRESHOLD = 40;

export function clampCatalogPage(
  currentPage: number,
  delta: number,
  pageCount: number,
): number {
  const lastPage = Math.max(0, pageCount - 1);
  return Math.max(0, Math.min(lastPage, currentPage + delta));
}

export function getTouchPageGesture(
  start: TouchPoint,
  end: TouchPoint,
): TouchPageGesture {
  const horizontalDelta = end.x - start.x;
  const verticalDelta = end.y - start.y;
  const dominantDelta =
    Math.abs(horizontalDelta) >= Math.abs(verticalDelta)
      ? horizontalDelta
      : verticalDelta;

  if (Math.abs(dominantDelta) <= TOUCH_SWIPE_THRESHOLD) {
    return { pageDelta: 0, suppressClick: false };
  }

  return {
    pageDelta: dominantDelta < 0 ? 1 : -1,
    suppressClick: true,
  };
}
