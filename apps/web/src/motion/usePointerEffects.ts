import { useEffect, type RefObject } from 'react';
import { hasFinePointer, prefersReducedMotion, supportsMotion } from './environment';

const FOLLOW_EASE = 0.2;
const MAGNET_PULL = 0.3;
/** Caps the pull in px so a wide control drifts a little instead of sliding out of its column. */
const MAGNET_LIMIT = 12;
/** How far a card turns toward the pointer at its edge, in degrees. */
const TILT_LIMIT = 5;
const TEXT_FIELDS = 'input:not([type="checkbox"]), textarea';
const INTERACTIVE = 'a, button, label';
const INERT = ':disabled, [aria-disabled="true"]';

/** The pointer's latest move over an element whose effect is applied on the next frame. */
interface Move {
  element: HTMLElement;
  event: PointerEvent;
}

const pull = (offset: number) =>
  Math.max(-MAGNET_LIMIT, Math.min(MAGNET_LIMIT, offset * MAGNET_PULL)).toFixed(1);

/** The spotlit card under the pointer, if any, and where the pointer is inside it. */
function measureSpotlight(event: PointerEvent) {
  const spot = event.target instanceof Element ? event.target.closest('[data-spot]') : null;
  if (!(spot instanceof HTMLElement)) return null;
  const bounds = spot.getBoundingClientRect();
  return {
    spot,
    x: Math.round(event.clientX - bounds.left),
    y: Math.round(event.clientY - bounds.top),
  };
}

/** How far a magnetic control is drawn toward the pointer. */
function measurePull({ element, event }: Move) {
  const bounds = element.getBoundingClientRect();
  return {
    element,
    x: pull(event.clientX - bounds.left - bounds.width / 2),
    y: pull(event.clientY - bounds.top - bounds.height / 2),
  };
}

/**
 * How a card turns toward the pointer: about the axis at right angles to the pointer's offset
 * from the centre, so the part of the card under the pointer sinks away.
 */
function measureTurn({ element, event }: Move) {
  const bounds = element.getBoundingClientRect();
  const across = (event.clientX - bounds.left) / bounds.width - 0.5;
  const down = (event.clientY - bounds.top) / bounds.height - 0.5;
  const angle = Math.min(1, Math.hypot(across, down) * 2) * TILT_LIMIT;
  return {
    element,
    rotate: `${(-down).toFixed(3)} ${across.toFixed(3)} 0 ${angle.toFixed(2)}deg`,
  };
}

/**
 * Pointer polish for precise pointers only: a trailing follower, magnetic controls, cards
 * that turn toward the pointer, spotlight coordinates, and the hero's sense of depth. The
 * native cursor stays visible, and every value is written through CSSOM properties so the
 * strict style CSP keeps holding.
 *
 * Pointer events only record what happened. Once per frame everything is measured, and only
 * then is anything written: a measurement that follows a write makes the browser restyle the
 * page there and then, in the middle of the frame.
 */
export function usePointerEffects(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !supportsMotion() || !hasFinePointer() || prefersReducedMotion()) return;
    const follower = root.querySelector<HTMLElement>('[data-follower]');
    if (!follower) return;
    // The parts of the hero that shift against the pointer. --look-x and --look-y are not
    // inherited (see motion.css), so each part is told directly.
    const heroLayers = Array.from(root.querySelectorAll<HTMLElement>('[data-hero-layer]'));
    const magnets = Array.from(root.querySelectorAll<HTMLElement>('[data-magnetic]'));
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]'));

    const controller = new AbortController();
    const { signal } = controller;
    const position = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let frame = 0;
    let spotMove: PointerEvent | null = null;
    let magnetMove: Move | null = null;
    let cardMove: Move | null = null;

    const render = () => {
      frame = 0;
      const { innerWidth, innerHeight, scrollY } = window;
      const spotlight = spotMove ? measureSpotlight(spotMove) : null;
      const pulled = magnetMove ? measurePull(magnetMove) : null;
      const turned = cardMove ? measureTurn(cardMove) : null;
      spotMove = null;
      magnetMove = null;
      cardMove = null;

      position.x += (position.targetX - position.x) * FOLLOW_EASE;
      position.y += (position.targetY - position.y) * FOLLOW_EASE;
      follower.style.setProperty(
        'translate',
        `${position.x.toFixed(1)}px ${position.y.toFixed(1)}px`,
      );
      // Where the pointer is, from -1 to 1 across the window: the hero's layers shift against it.
      if (scrollY < innerHeight) {
        const lookX = ((position.x / innerWidth) * 2 - 1).toFixed(3);
        const lookY = ((position.y / innerHeight) * 2 - 1).toFixed(3);
        for (const layer of heroLayers) {
          layer.style.setProperty('--look-x', lookX);
          layer.style.setProperty('--look-y', lookY);
        }
      }
      if (spotlight) {
        spotlight.spot.style.setProperty('--spot-x', `${spotlight.x}px`);
        spotlight.spot.style.setProperty('--spot-y', `${spotlight.y}px`);
      }
      if (pulled) {
        pulled.element.style.setProperty('--pull-x', `${pulled.x}px`);
        pulled.element.style.setProperty('--pull-y', `${pulled.y}px`);
      }
      if (turned) turned.element.style.setProperty('rotate', turned.rotate);

      const settled =
        Math.abs(position.targetX - position.x) < 0.1 &&
        Math.abs(position.targetY - position.y) < 0.1;
      if (!settled) frame = requestAnimationFrame(render);
    };

    // Runs after the handlers on the elements under the pointer, which have recorded their moves.
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      position.targetX = event.clientX;
      position.targetY = event.clientY;
      if (!follower.hasAttribute('data-visible')) {
        position.x = event.clientX;
        position.y = event.clientY;
        follower.setAttribute('data-visible', '');
      }
      spotMove = event;
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest(TEXT_FIELDS)) follower.dataset.state = 'text';
      else if (target.closest(INTERACTIVE) && !target.closest(INERT)) {
        follower.dataset.state = 'active';
      } else follower.dataset.state = 'idle';
    };

    const release = () => follower.removeAttribute('data-pressed');

    window.addEventListener('pointermove', onMove, { passive: true, signal });
    document.addEventListener('pointerover', onOver, { passive: true, signal });
    document.addEventListener('pointerdown', () => follower.setAttribute('data-pressed', ''), {
      passive: true,
      signal,
    });
    // A press that turns into a drag, or is let go outside the window, never sends pointerup.
    document.addEventListener('pointerup', release, { passive: true, signal });
    document.addEventListener('pointercancel', release, { passive: true, signal });
    document.documentElement.addEventListener(
      'pointerleave',
      () => {
        follower.removeAttribute('data-visible');
        release();
      },
      { signal },
    );

    for (const magnet of magnets) {
      magnet.addEventListener(
        'pointermove',
        (event) => {
          magnetMove = { element: magnet, event };
        },
        { passive: true, signal },
      );
      magnet.addEventListener(
        'pointerleave',
        () => {
          if (magnetMove?.element === magnet) magnetMove = null;
          magnet.style.removeProperty('--pull-x');
          magnet.style.removeProperty('--pull-y');
        },
        { signal },
      );
    }

    for (const card of cards) {
      card.addEventListener(
        'pointermove',
        (event) => {
          cardMove = { element: card, event };
        },
        { passive: true, signal },
      );
      card.addEventListener(
        'pointerleave',
        () => {
          if (cardMove?.element === card) cardMove = null;
          card.style.removeProperty('rotate');
        },
        { signal },
      );
    }

    return () => {
      controller.abort();
      cancelAnimationFrame(frame);
      follower.removeAttribute('data-visible');
      release();
      for (const layer of heroLayers) {
        layer.style.removeProperty('--look-x');
        layer.style.removeProperty('--look-y');
      }
      for (const magnet of magnets) {
        magnet.style.removeProperty('--pull-x');
        magnet.style.removeProperty('--pull-y');
      }
      for (const card of cards) card.style.removeProperty('rotate');
    };
  }, [rootRef]);
}
