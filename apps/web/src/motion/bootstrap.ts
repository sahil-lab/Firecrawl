import { prefersReducedMotion, supportsMotion } from './environment';
import { sceneSettled } from './sceneSignals';

const INTRO_FONTS = ['560 1em "Geist Variable"', 'italic 400 1em "Instrument Serif"'];
const INTRO_FONT_TIMEOUT_MS = 1200;
/** The opening curtain stays down at least this long, so its mark has time to draw. */
const INTRO_HOLD_MS = 700;
/** How long the opening waits for the scene, so that the camera's dive is not missed. */
const INTRO_SCENE_TIMEOUT_MS = 1800;

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });

/**
 * Runs before the first render so entrance states apply from the first paint instead of
 * flashing visible content. The opening is released once its display fonts are usable and
 * the scene behind the page has drawn its first frame. Each wait has a timeout, so neither a
 * slow font nor a slow GPU can keep the page hidden.
 */
export function bootstrapMotion(): void {
  if (!supportsMotion()) return;
  const root = document.documentElement;
  root.dataset.motion = 'on';
  const release = () => {
    root.dataset.intro = 'ready';
  };
  // With reduced motion nothing is hidden and nothing plays, so there is nothing to wait for.
  if (prefersReducedMotion()) {
    release();
    return;
  }
  const fonts = Promise.all(INTRO_FONTS.map((font) => document.fonts.load(font)));
  void Promise.all([
    Promise.race([fonts, wait(INTRO_FONT_TIMEOUT_MS)]),
    Promise.race([sceneSettled, wait(INTRO_SCENE_TIMEOUT_MS)]),
    wait(INTRO_HOLD_MS),
  ]).then(release, release);
}
