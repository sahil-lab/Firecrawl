import type { Mood, Pulse, Scene } from './scene/scene';

/**
 * The one channel from the page to the scene behind it. Sections say what happened (the
 * readiness answer, the outcome of a validation); the scene decides what, if anything, to
 * show for it. With no scene mounted every call here does nothing.
 */

let scene: Pick<Scene, 'setMood' | 'pulse'> | null = null;
let mood: Mood = 'checking';
let settle: () => void = () => undefined;

/** Resolves once the scene has drawn its first frame, or once it is clear there will be none. */
export const sceneSettled = new Promise<void>((resolve) => {
  settle = resolve;
});

export function markSceneSettled(): void {
  settle();
}

/** Hands a mounted scene the current mood and every later signal. Returns the disconnect. */
export function connectScene(next: Pick<Scene, 'setMood' | 'pulse'>): () => void {
  scene = next;
  next.setMood(mood);
  return () => {
    if (scene === next) scene = null;
  };
}

export function setSceneMood(next: Mood): void {
  mood = next;
  scene?.setMood(next);
}

export function pulseScene(kind: Pulse): void {
  scene?.pulse(kind);
}
