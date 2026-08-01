export type TouchPoint = {
  x: number;
  y: number;
};

export type TouchPageGesture = {
  pageDelta: -1 | 0 | 1;
  suppressClick: boolean;
};

type FocusTargetRef = {
  current: { focus: () => void } | null;
};

export function closeCatalogAndRestoreFocus(
  onClose: () => void,
  openerRef: FocusTargetRef | undefined,
  schedule: (callback: () => void) => unknown,
): void {
  onClose();
  schedule(() => openerRef?.current?.focus());
}

export function selectCatalogSong<T>(
  song: T,
  onSelect: (song: T) => void,
  closeCatalog: () => void,
): void {
  onSelect(song);
  closeCatalog();
}

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
