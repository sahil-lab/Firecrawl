/** Everything about the camera and the look of the scene that changes from section to section. */
export interface Pose {
  /** Camera height above the lane, in world units. */
  height: number;
  /** How far the camera looks down, in radians. Negative looks up. */
  pitch: number;
  /** Share of the land's full relief. */
  relief: number;
  /** Brightness of the contour lines. */
  strength: number;
  /**
   * The brightest any line may get, whatever is lighting it up. It keeps the picture calm
   * where sheets of content cover most of it.
   */
  cap: number;
  /** Distance at which the land has mostly faded into the sky. */
  fog: number;
  /** Brightness of the horizon. */
  glow: number;
  /** Line strength kept at the bottom edge of the screen, where the hero's small print sits. */
  fadeLow: number;
  /** How far up the screen the fade from the bottom edge reaches, as a share of its height. */
  fadeTop: number;
  /** Line strength kept at the left edge of the screen, behind the headline. */
  fadeLeft: number;
  /** Forward speed while nothing else moves the camera. */
  cruise: number;
  /** Strength of the sweep that crosses the land every few seconds. */
  scan: number;
  /**
   * Where the lane meets the horizon, as a share of half the screen's width: positive is right
   * of centre. The camera turns away from the lane to put it there, which keeps the brightest
   * part of the picture clear of the copy. Looking down, it is how far the lane is turned.
   */
  shift: number;
}

const FIELDS = [
  'height',
  'pitch',
  'relief',
  'strength',
  'cap',
  'fog',
  'glow',
  'fadeLow',
  'fadeTop',
  'fadeLeft',
  'cruise',
  'scan',
  'shift',
] as const;

const degrees = (angle: number) => (angle * Math.PI) / 180;

/**
 * One pose per part of the page, named by that part's `data-scene-pose` attribute. Only the
 * hero and the footer, which are open to the scene, look toward the horizon and its sun.
 * Between them the page's content is on sheets, and the camera climbs and looks down on the
 * land, which shows around the sheets and behind the section titles.
 */
const POSES: Record<string, Pose> = {
  hero: {
    height: 1.25,
    pitch: degrees(7),
    relief: 1,
    strength: 1,
    cap: 1,
    fog: 44,
    glow: 1,
    fadeLow: 0.4,
    fadeTop: 0.4,
    fadeLeft: 0.55,
    cruise: 1,
    scan: 1,
    shift: 0.84,
  },
  validate: {
    height: 5.2,
    pitch: degrees(60),
    relief: 0.75,
    strength: 0.62,
    cap: 0.5,
    fog: 60,
    glow: 0,
    fadeLow: 1,
    fadeTop: 0.4,
    fadeLeft: 1,
    cruise: 0.6,
    scan: 0.4,
    shift: 0.4,
  },
  readiness: {
    height: 3.2,
    pitch: degrees(36),
    relief: 1,
    strength: 0.66,
    cap: 0.5,
    fog: 34,
    glow: 0,
    fadeLow: 1,
    fadeTop: 0.4,
    fadeLeft: 1,
    cruise: 0.8,
    scan: 0.4,
    shift: -0.5,
  },
  scope: {
    height: 8,
    pitch: degrees(84),
    relief: 0.65,
    strength: 0.58,
    cap: 0.5,
    fog: 70,
    glow: 0,
    fadeLow: 1,
    fadeTop: 0.4,
    fadeLeft: 1,
    cruise: 0.5,
    scan: 0.4,
    shift: -0.9,
  },
  footer: {
    height: 1.1,
    pitch: degrees(-12),
    relief: 1.1,
    strength: 0.9,
    cap: 1,
    fog: 40,
    glow: 1.25,
    fadeLow: 1,
    fadeTop: 0.4,
    fadeLeft: 1,
    cruise: 1,
    scan: 0.6,
    shift: 0,
  },
};

/**
 * What changes in a window that is taller than it is wide. There the hero's copy is stacked up
 * the middle with no room beside it, so the camera looks down more, which lifts the sun above
 * the headline instead of moving it to the side, and the lines fade from higher up.
 */
const NARROW: Record<string, Partial<Pose>> = {
  hero: { pitch: degrees(18), shift: 0.25, fadeTop: 0.7, fadeLeft: 1 },
};

/** The window shapes between which a pose changes from its narrow form to its wide one. */
const NARROW_ASPECT = 1.15;
const WIDE_ASPECT = 1.3;

/** Where the opening starts: high above a nearly flat map, before the camera dives and turns. */
export const OPENING: Pose = {
  height: 10,
  pitch: degrees(86),
  relief: 0.08,
  strength: 0.75,
  cap: 1,
  fog: 80,
  glow: 0,
  fadeLow: 1,
  fadeTop: 0.4,
  fadeLeft: 1,
  cruise: 0,
  scan: 0,
  shift: -0.5,
};

/** A pose and the stretch of scrolling over which the page moves into it from the one before. */
export interface Stop {
  from: number;
  to: number;
  pose: Pose;
}

/**
 * A part of the page starts to take the camera over when its top edge is this far down the
 * window, as a share of the window's height, and has it once the edge has risen to ARRIVE_AT.
 * In between two such stretches the camera holds its pose.
 */
const ENTER_AT = 0.8;
const ARRIVE_AT = 0.2;

/** Writes the pose a share of the way from one to another. `into` may be either of them. */
export function mixPose(from: Pose, to: Pose, share: number, into: Pose): void {
  for (const field of FIELDS) into[field] = from[field] + (to[field] - from[field]) * share;
}

/**
 * Moves a pose a share of the way toward a target and reports whether it is still noticeably
 * away from it. Once it is not, it lands on the target exactly.
 */
export function easePose(pose: Pose, target: Pose, share: number): boolean {
  let moving = false;
  for (const field of FIELDS) {
    const gap = target[field] - pose[field];
    if (Math.abs(gap) > 0.0005 * Math.max(1, Math.abs(target[field]))) {
      pose[field] += gap * share;
      moving = true;
    } else {
      pose[field] = target[field];
    }
  }
  return moving;
}

/** The pose a part of the page asks for in a window of the current shape, if it names one. */
export function poseFor(name: string): Pose | null {
  const wide = POSES[name];
  if (!wide) return null;
  const pose = { ...wide };
  const narrow = NARROW[name];
  if (narrow) {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const room = Math.min(1, Math.max(0, (aspect - NARROW_ASPECT) / (WIDE_ASPECT - NARROW_ASPECT)));
    mixPose({ ...wide, ...narrow }, wide, room * room * (3 - 2 * room), pose);
  }
  return pose;
}

/**
 * Finds the parts of the page that name a pose and the stretch of scrolling over which each
 * takes over from the one before it. The last part may never reach the top of the window, so
 * every stretch ends by the end of the page.
 */
export function measureStops(root: ParentNode): Stop[] {
  const tall = window.innerHeight;
  const end = Math.max(0, document.documentElement.scrollHeight - tall);
  const stops: Stop[] = [];
  root.querySelectorAll<HTMLElement>('[data-scene-pose]').forEach((part) => {
    const pose = poseFor(part.dataset.scenePose ?? '');
    if (!pose) return;
    const top = part.getBoundingClientRect().top + window.scrollY;
    const to = Math.min(end, Math.max(0, top - tall * ARRIVE_AT));
    const from = Math.max(stops.at(-1)?.to ?? 0, Math.min(to, top - tall * ENTER_AT));
    stops.push({ from, to: Math.max(to, from), pose });
  });
  return stops;
}

/**
 * Writes the pose for a scroll position: the pose being held, or an eased blend into the next.
 * Leaves `into` untouched when there are no stops.
 */
export function poseAt(stops: readonly Stop[], scroll: number, into: Pose): void {
  let held = stops[0]?.pose;
  if (!held) return;
  for (const stop of stops) {
    if (scroll >= stop.to) {
      held = stop.pose;
      continue;
    }
    if (scroll > stop.from) {
      const share = (scroll - stop.from) / (stop.to - stop.from);
      mixPose(held, stop.pose, share * share * (3 - 2 * share), into);
      return;
    }
    break;
  }
  mixPose(held, held, 0, into);
}
