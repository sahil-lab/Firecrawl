import { useEffect, type RefObject } from 'react';
import { supportsMotion } from './environment';

/** Marks `[data-reveal]` descendants with `data-inview` the first time they scroll into view. */
export function useReveal(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !supportsMotion()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-inview', '');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll('[data-reveal]').forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [rootRef]);
}
