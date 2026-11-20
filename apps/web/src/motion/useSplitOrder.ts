import { useLayoutEffect, type RefObject } from 'react';

/**
 * Numbers the characters of every `[data-split]` block in reading order by setting `--i` on
 * each one, which the stylesheet turns into a delay. The value goes in through the CSSOM, so
 * the strict style CSP keeps holding, and before the first paint, so no animation starts
 * without it.
 */
export function useSplitOrder(rootRef: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    rootRef.current?.querySelectorAll('[data-split]').forEach((block) => {
      block.querySelectorAll<HTMLElement>('[data-char]').forEach((character, index) => {
        character.style.setProperty('--i', String(index));
      });
    });
  }, [rootRef]);
}
