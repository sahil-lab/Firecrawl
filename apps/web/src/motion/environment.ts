const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Motion is a progressive enhancement. It needs APIs that non-visual environments such as
 * jsdom do not provide, and every piece of content must stay readable without it.
 */
export function supportsMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' && typeof window.IntersectionObserver === 'function'
  );
}

export function reducedMotionQuery(): MediaQueryList {
  return window.matchMedia(REDUCED_MOTION_QUERY);
}

export function prefersReducedMotion(): boolean {
  return reducedMotionQuery().matches;
}

export function hasFinePointer(): boolean {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}
