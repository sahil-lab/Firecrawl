import { useEffect, type RefObject } from 'react';
import { supportsMotion } from './environment';

const SCROLLED_OFFSET = 24;
const VELOCITY_GAIN = 2.2;
const MAX_BOOST = 5;
const RATE_EASE = 0.12;
/** Degrees the marquee's words lean per px/ms of scrolling, and the most they ever lean. */
const LEAN_GAIN = 3.5;
const MAX_LEAN = 9;

/**
 * Publishes scroll state as CSS custom properties and lets the marquee pick up scroll
 * velocity: its tracks speed up and its words lean into the direction of travel. Each property
 * is written on the very elements that use it, and the ones written on elements with many
 * descendants are registered as not inherited (see motion.css), so a scroll frame restyles
 * those elements and nothing inside them.
 * Tracks only ever speed up: a negative playback rate would run an infinite CSS animation back
 * to its start and stop it there.
 * The strip is also told when it is out of view, so the stylesheet can rest its animations.
 */
export function useScrollEffects(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !supportsMotion()) return;
    const progressBar = root.querySelector<HTMLElement>('[data-scroll-progress]');
    // What changes as the hero scrolls away: the layers that drift, and the parts of the
    // headline that fade and part.
    const leaving = Array.from(
      root.querySelectorAll<HTMLElement>('[data-hero-layer], [data-hero-exit]'),
    );
    const strip = root.querySelector<HTMLElement>('[data-marquee]');
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-marquee-row]'));
    const tracks = Array.from(root.querySelectorAll<HTMLElement>('[data-marquee-track]'));
    const controller = new AbortController();
    const { signal } = controller;

    let frame = 0;
    let lastY = window.scrollY;
    let lastTime = performance.now();
    let rate = 1;
    let lean = 0;
    let heroProgress = '';
    let leaning = '';
    let stripInView = true;

    // The window is taken a pixel short at the top and bottom: a strip that only touches the
    // window's edge, as this one does below the hero before any scrolling, counts as in view.
    const watcher = new IntersectionObserver(
      (entries) => {
        stripInView = entries[entries.length - 1].isIntersecting;
        strip?.toggleAttribute('data-offscreen', !stripInView);
      },
      { rootMargin: '-1px 0px' },
    );
    if (strip) watcher.observe(strip);

    const update = (now: number) => {
      frame = 0;
      // Everything is read before anything is written. Asking a track for its animations
      // after a change to the page makes the browser restyle first, once per track asked.
      const y = window.scrollY;
      const tall = window.innerHeight;
      const range = document.documentElement.scrollHeight - tall;
      const running = stripInView ? tracks.flatMap((track) => track.getAnimations()) : [];

      progressBar?.style.setProperty(
        '--scroll-progress',
        range > 0 ? Math.min(1, y / range).toFixed(4) : '0',
      );
      root.toggleAttribute('data-scrolled', y > SCROLLED_OFFSET);

      const nextHeroProgress = Math.min(1, y / tall).toFixed(3);
      if (nextHeroProgress !== heroProgress) {
        heroProgress = nextHeroProgress;
        for (const part of leaving) part.style.setProperty('--hero-progress', heroProgress);
      }

      const velocity = (y - lastY) / Math.max(1, now - lastTime);
      const speed = Math.abs(velocity);
      lastY = y;
      lastTime = now;
      const targetRate = 1 + Math.min(MAX_BOOST, speed * VELOCITY_GAIN);
      rate += (targetRate - rate) * RATE_EASE;
      const targetLean = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, velocity * LEAN_GAIN));
      lean += (targetLean - lean) * RATE_EASE;
      if (Math.abs(lean) < 0.02) lean = 0;
      // Nothing is written to a strip that is out of view; it catches up when it returns.
      if (stripInView) {
        for (const animation of running) animation.playbackRate = rate;
        const nextLeaning = lean.toFixed(2);
        if (nextLeaning !== leaning) {
          leaning = nextLeaning;
          for (const row of rows) row.style.setProperty('--marquee-lean', leaning);
        }
      }
      if (speed > 0 || Math.abs(targetRate - rate) > 0.01 || lean !== 0) {
        frame = requestAnimationFrame(update);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('resize', schedule, { passive: true, signal });
    schedule();

    return () => {
      controller.abort();
      watcher.disconnect();
      strip?.removeAttribute('data-offscreen');
      cancelAnimationFrame(frame);
    };
  }, [rootRef]);
}
