/**
 * Stacked-card geometry for the hero carousel. Shared by Carousel.astro (initial server-rendered
 * styles, so there's no first-paint jump) and scripts/carousel.ts (animated changes).
 * Depth 0 is the active card; deeper cards peek out below it (by `--peek` per level),
 * smaller and fainter. Cards beyond MAX_VISIBLE_DEPTH sit at the back fully transparent.
 */
/** Active card + 2 behind it = 3 visible cards. */
export const MAX_VISIBLE_DEPTH = 2;
export const SCALE_STEP = 0.06;
export const OPACITY_STEP = 0.3;

export interface StackStyle {
  transform: string;
  opacity: number;
  zIndex: number;
}

export const stackStyle = (depth: number, total: number): StackStyle => {
  const d = Math.min(depth, MAX_VISIBLE_DEPTH);
  return {
    transform: `translate(0px, calc(${d} * var(--peek, 0px))) scale(${Number((1 - SCALE_STEP * d).toFixed(2))})`,
    opacity: depth > MAX_VISIBLE_DEPTH ? 0 : Number((1 - OPACITY_STEP * d).toFixed(2)),
    zIndex: total - depth,
  };
};

/** Where the active card goes when it leaves (forward) — and where it enters from (backward). */
export const exitStyle = (total: number): StackStyle => ({
  transform: 'translate(-110%, 0px) scale(1)',
  opacity: 0,
  zIndex: total + 1,
});

export const toCss = ({ transform, opacity, zIndex }: StackStyle) =>
  `transform: ${transform}; opacity: ${opacity}; z-index: ${zIndex}`;
