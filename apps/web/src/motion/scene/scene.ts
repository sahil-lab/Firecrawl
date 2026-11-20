import { reducedMotionQuery } from '../environment';
import {
  OPENING,
  easePose,
  measureStops,
  mixPose,
  poseAt,
  poseFor,
  type Pose,
  type Stop,
} from './poses';
import {
  GRID_COLUMNS,
  GRID_ROWS,
  LAND_FRAGMENT,
  MAX_CLEARS,
  MOTE_COUNT,
  MOTE_DEPTH,
  MOTE_FRAGMENT,
  MOTE_VERTEX,
  SKY_FRAGMENT,
  SKY_VERTEX,
  SUN_RADIUS,
  landVertex,
} from './shaders';
import {
  BROAD,
  FINE,
  MAX_RIPPLES,
  RELIEF,
  RIPPLE_LIFE_MS,
  foldOffset,
  landHeight,
  rippleScale,
  type Drift,
} from './terrain';

/** What the readiness check last answered. */
export type Mood = 'checking' | 'ready' | 'unavailable';
/** How a request validation ended. */
export type Pulse = 'valid' | 'invalid';

export interface Scene {
  /** Tints the scene from the readiness answer. */
  setMood(mood: Mood): void;
  /** Sends a ring across the land when a request has been checked. */
  pulse(kind: Pulse): void;
  destroy(): void;
}

/**
 * Frames closer together than this are skipped, so displays faster than about 110 Hz draw
 * every second or third frame.
 */
const MIN_FRAME_MS = 9;
/**
 * How often the scene draws depends on what is changing. While the camera is travelling it
 * draws every frame the display has. While only the slow cruise moves the picture, about 30
 * frames a second are enough. Between the hero and the footer, where sheets of content cover
 * most of it, it asks for less still: about 30 a second while the pointer is changing it, and
 * about 20 otherwise. Those are the poses that cap their lines below COVERED_CAP.
 */
const CALM_FRAME_MS = 30;
const COVERED_FRAME_MS = 48;
const COVERED_CAP = 0.75;
/**
 * The page is struggling when its animation frames come this much slower than the display
 * refreshes: below 48 a second on a 60 Hz display, for example. The limit never asks for more
 * than one frame every SMOOTH_FRAME_MS, so a fast display is not held to its full rate, and
 * never accepts less than one every SLOW_FRAME_MS, however slow the display seems to be.
 */
const STRUGGLE_SHARE = 1.25;
const SMOOTH_FRAME_MS = 1000 / 48;
const SLOW_FRAME_MS = 1000 / 24;
/**
 * The display's refresh interval is taken to be the smallest middle value of this many
 * consecutive gaps between animation frames. One frame that comes late, or the short gap
 * after it, does not move a middle value. Averaging two gaps did: a short gap followed by an
 * ordinary one was measured to pull the estimate down for good.
 */
const REFRESH_SAMPLES = 5;
/** One gap never counts for more than this, so a single long pause is forgotten quickly. */
const PACE_CAP_MS = 250;
/** How long frames have to stay slow without a break before the scene gives up some quality. */
const STRUGGLE_HOLD_MS = 2000;
const PACE_EASE = 0.2;
/** The shares of its full resolution that the scene steps down through before it stops. */
const QUALITY_STEPS = [1, 0.7, 0.5];
/**
 * A step down is not for good. Once the page has stayed smooth for RAISE_AFTER_MS while the
 * scene was drawing every frame, the scene tries the step above again. If frames turn slow
 * within RAISE_TRIAL_MS of that, it steps back down and waits RAISE_BACKOFF times as long
 * before the next try, up to RAISE_AFTER_MAX_MS; a step up that lasts longer than that puts
 * the wait back where it started. Frames count as smooth here while they come no more than
 * SMOOTH_SHARE slower than the display refreshes.
 */
const RAISE_AFTER_MS = 6000;
const RAISE_TRIAL_MS = 8000;
const RAISE_BACKOFF = 3;
const RAISE_AFTER_MAX_MS = 180_000;
const SMOOTH_SHARE = 1.1;
/**
 * A scene that has stopped starts again by itself after each of these pauses in turn, at the
 * step it stopped on. After the last of them it stays stopped until the page is next brought
 * back to the front. One that then keeps running for RESUME_TRIAL_MS gets every try back.
 */
const RESUME_AFTER_MS = [20_000, 60_000, 180_000];
const RESUME_TRIAL_MS = 15_000;
/**
 * How long a scene that starts again takes to fade in, where the still picture it replaces was
 * not simply the same view.
 */
const WAKE_MS = 700;
/** Loading and the opening make any device uneven at first, so the first moments are not judged. */
const SETTLE_MS = 4000;
/** Nor are the first moments after the scene starts again from a pause or a stop. */
const RESTART_SETTLE_MS = 1500;
/** If the browser never reports the shaders as ready, stop asking politely after this long. */
const LINK_PATIENCE_MS = 5000;
/**
 * The scene is drawn at up to this many buffer pixels per CSS pixel, whatever the display's own
 * density. On an ordinary display the browser averages neighbouring pixels when it scales the
 * picture down, which softens the land's outlines; multisampling did that better but was
 * measured to double the cost of the whole scene. MAX_BUFFER_PIXELS bounds the result: a
 * 1440x900 window gets about one and a half times its layout size.
 */
const DENSITY = 2;
const MAX_BUFFER_PIXELS = 2_800_000;

/** How long the opening dive from the flat map down to the hero's view takes. */
const INTRO_MS = 2800;
/** Tangent of half the vertical field of view, and the least the horizontal one may be. */
const TAN_HALF_VIEW = Math.tan((25 * Math.PI) / 180);
const TAN_HALF_ACROSS = Math.tan((24 * Math.PI) / 180);
const TAN_WIDEST = Math.tan((39 * Math.PI) / 180);
const NEAR = 0.1;
const FAR = 240;
/** The land has faded into the sky at this many times the pose's fog distance. */
const FADED_OUT = 2.1;
/** How much wider than the view each row of the grid is, for land that rises into view. */
const GRID_MARGIN = 1.25;
/** The sky can show through the far land down to this far below the horizon, in clip units. */
const SKY_BELOW_HORIZON = 0.15;
/** How quickly the sun changes between solid and outline as display type moves in front of it. */
const SHADE_EASE_MS = 260;
/**
 * The scene stays dim inside the box around the text of each piece of display type, grown by
 * CLEAR_PAD pixels, and returns to full brightness across CLEAR_EDGE pixels around that.
 */
const CLEAR_PAD = 14;
const CLEAR_EDGE = 28;
/** Where a box that is not in use is put, in buffer pixels. */
const NOWHERE = -100000;
/** World units the camera cruises per millisecond, and travels per pixel scrolled. */
const CRUISE_PER_MS = 0.00011;
const TRAVEL_PER_PIXEL = 0.011;
/** How quickly the camera catches up with scrolling, a new pose, and the pointer. */
const SCROLL_EASE_MS = 180;
const POSE_EASE_MS = 260;
const LOOK_EASE_MS = 380;
/** How far the pointer turns and tilts the camera, in radians. */
const LOOK_YAW = 0.06;
const LOOK_PITCH = 0.035;
/** How quickly the lift follows the pointer, and how quickly it rises and falls. */
const FOLLOW_MS = 110;
const SWELL_MS = 240;
const MOOD_EASE_MS = 700;
/** The sweep that crosses the land: how often, for how long, and how far it gets. */
const SCAN_EVERY_MS = 9000;
const CHECK_SCAN_EVERY_MS = 1500;
const SCAN_MS = 3400;
const SCAN_REACH = 44;
/** The ring sent out when a request has been checked. */
const PULSE_MS = 2400;
const PULSE_REACH = 46;
const PULSE_AHEAD = 5;

const FALLBACK_ACCENT = [212, 245, 106];
const FALLBACK_ACCENT_FAR = [96, 232, 214];
const FALLBACK_DANGER = [255, 134, 114];
const FALLBACK_DANGER_FAR = [255, 176, 128];

const CLEAR_UNIFORMS = ['uClear', 'uClearEdge'] as const;
const SKY_UNIFORMS = [
  'uResolution',
  'uSky',
  'uTint',
  'uTintFar',
  'uStars',
  'uSun',
  ...CLEAR_UNIFORMS,
] as const;
const LAND_UNIFORMS = [
  'uGrid',
  'uCamera',
  'uHeading',
  'uLens',
  'uDrift',
  'uLift',
  'uRelief',
  'uRipples',
  'uResolution',
  'uLook',
  'uFade',
  'uTint',
  'uTintFar',
  'uScan',
  'uPulse',
  'uPulseTint',
  ...CLEAR_UNIFORMS,
] as const;
const MOTE_UNIFORMS = [
  'uResolution',
  'uCamera',
  'uHeading',
  'uLens',
  'uDust',
  'uMote',
  ...CLEAR_UNIFORMS,
] as const;

/** A program that is still compiling and linking, with the shaders it is made from. */
interface Build {
  program: WebGLProgram;
  vertex: WebGLShader;
  fragment: WebGLShader;
}

/** A linked program and where its uniforms live. */
interface Linked<Name extends string> {
  program: WebGLProgram;
  at: Record<Name, WebGLUniformLocation | null>;
}

interface Buffers {
  triangle: WebGLBuffer | null;
  grid: WebGLBuffer | null;
  corners: WebGLBuffer | null;
  seeds: WebGLBuffer | null;
}

interface PendingStage extends Buffers {
  sky: Build;
  calm: Build;
  rippling: Build;
  motes: Build;
  /** What to ask a program to learn whether its link is done, where the browser can tell. */
  completionStatus: number | null;
}

interface Stage extends Buffers {
  sky: Linked<(typeof SKY_UNIFORMS)[number]>;
  /** Shapes the same land as `rippling` when no ripple is alive, for less work per grid point. */
  calm: Linked<(typeof LAND_UNIFORMS)[number]>;
  rippling: Linked<(typeof LAND_UNIFORMS)[number]>;
  motes: Linked<(typeof MOTE_UNIFORMS)[number]>;
}

interface Ripple {
  x: number;
  /** Position along the lane in the world, which stays put while the camera travels. */
  z: number;
  born: number;
  /** How much longer than ordinary it is drawn, set from how far away it started. */
  scale: number;
}

/** A piece of display type that the page asked the scene to stay dim behind. */
interface Clear {
  /**
   * Its text. The browser can say where the boxes of a range of text are drawn at any moment,
   * whatever is animating its characters or moving the element they are in.
   */
  text: Range;
  /** Where layout puts it on the page: enough to tell whether it is anywhere near the window. */
  top: number;
  bottom: number;
}

/** Where layout puts an element on the page, from its top edge to its bottom edge. */
function layoutSpan(element: HTMLElement): { top: number; bottom: number } {
  let top = 0;
  for (let node: Element | null = element; node instanceof HTMLElement; node = node.offsetParent) {
    top += node.offsetTop;
  }
  return { top, bottom: top + element.offsetHeight };
}

/** The grid the land is shaped from, with its rows ordered from the camera outward. */
function gridMesh(): { points: Float32Array; corners: Uint16Array } {
  const points = new Float32Array(GRID_COLUMNS * (GRID_ROWS + 1) * 2);
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const at = (row * GRID_COLUMNS + column) * 2;
      points[at] = column / (GRID_COLUMNS - 1);
      points[at + 1] = row / GRID_ROWS;
    }
  }
  const corners = new Uint16Array(GRID_ROWS * (GRID_COLUMNS - 1) * 6);
  let next = 0;
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS - 1; column += 1) {
      const near = row * GRID_COLUMNS + column;
      const far = near + GRID_COLUMNS;
      corners.set([near, far, near + 1, near + 1, far, far + 1], next);
      next += 6;
    }
  }
  return { points, corners };
}

function randomSeeds(): Float32Array {
  const seeds = new Float32Array(MOTE_COUNT * 3);
  for (let at = 0; at < seeds.length; at += 1) seeds[at] = Math.random();
  return seeds;
}

/** A colour from the stylesheet, written there as three 0-255 channels, as 0..1 channels. */
function readColor(style: CSSStyleDeclaration, name: string, fallback: number[]): number[] {
  const channels = style.getPropertyValue(name).trim().split(/\s+/).map(Number);
  const usable = channels.length === 3 && channels.every(Number.isFinite);
  return (usable ? channels : fallback).map((channel) => channel / 255);
}

/**
 * Starts compiling and linking one program and asks nothing about how it went: any question
 * here would hold the page up until the GPU process had finished the work.
 */
function startBuild(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
  attribute: string,
): Build | null {
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.deleteProgram(program);
    return null;
  }
  gl.shaderSource(vertex, vertexSource);
  gl.compileShader(vertex);
  gl.shaderSource(fragment, fragmentSource);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, attribute);
  gl.linkProgram(program);
  return { program, vertex, fragment };
}

function discardBuild(gl: WebGLRenderingContext, build: Build | null): void {
  if (!build) return;
  gl.deleteShader(build.vertex);
  gl.deleteShader(build.fragment);
  gl.deleteProgram(build.program);
}

/** Turns a build into a usable program. Waits for the link if it is still running. */
function finishBuild<Name extends string>(
  gl: WebGLRenderingContext,
  build: Build,
  names: readonly Name[],
): Linked<Name> | null {
  const { program, vertex, fragment } = build;
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(
      'Scene program did not link:',
      gl.getProgramInfoLog(program),
      gl.getShaderInfoLog(vertex),
      gl.getShaderInfoLog(fragment),
    );
    discardBuild(gl, build);
    return null;
  }
  // A linked program keeps what it needs; the shader objects can be released.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  const at = {} as Record<Name, WebGLUniformLocation | null>;
  for (const name of names) at[name] = gl.getUniformLocation(program, name);
  return { program, at };
}

function deleteBuffers(gl: WebGLRenderingContext, buffers: Buffers): void {
  gl.deleteBuffer(buffers.triangle);
  gl.deleteBuffer(buffers.grid);
  gl.deleteBuffer(buffers.corners);
  gl.deleteBuffer(buffers.seeds);
}

/** Starts every program and uploads what never changes. Null when WebGL cannot draw the scene. */
function startStage(
  gl: WebGLRenderingContext,
  mesh: { points: Float32Array; corners: Uint16Array },
  seeds: Float32Array,
): PendingStage | null {
  if (gl.isContextLost()) return null;
  // Positions and noise offsets need more range than medium precision is sure to have.
  const highFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!highFloat || highFloat.precision === 0) return null;
  // The contour lines get their width from screen-space derivatives.
  if (!gl.getExtension('OES_standard_derivatives')) return null;
  // Has to be switched on before linking for the links to run in the background.
  const parallel = gl.getExtension('KHR_parallel_shader_compile');

  const sky = startBuild(gl, SKY_VERTEX, SKY_FRAGMENT, 'aPosition');
  const calm = startBuild(gl, landVertex(false), LAND_FRAGMENT, 'aGrid');
  const rippling = startBuild(gl, landVertex(true), LAND_FRAGMENT, 'aGrid');
  const motes = startBuild(gl, MOTE_VERTEX, MOTE_FRAGMENT, 'aSeed');
  if (!sky || !calm || !rippling || !motes) {
    for (const build of [sky, calm, rippling, motes]) discardBuild(gl, build);
    return null;
  }

  // One triangle that covers the whole viewport, for the sky.
  const triangle = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const grid = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, grid);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.points, gl.STATIC_DRAW);
  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, corners);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.corners, gl.STATIC_DRAW);
  const seedBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  return {
    sky,
    calm,
    rippling,
    motes,
    triangle,
    grid,
    corners,
    seeds: seedBuffer,
    completionStatus: parallel ? parallel.COMPLETION_STATUS_KHR : null,
  };
}

/** Whether every link is done. True straight away where the browser cannot say without waiting. */
function hasLinked(gl: WebGLRenderingContext, pending: PendingStage): boolean {
  const { completionStatus } = pending;
  if (completionStatus === null) return true;
  return [pending.sky, pending.calm, pending.rippling, pending.motes].every(
    (build) => gl.getProgramParameter(build.program, completionStatus) === true,
  );
}

function finishStage(gl: WebGLRenderingContext, pending: PendingStage): Stage | null {
  if (gl.isContextLost()) return null;
  const sky = finishBuild(gl, pending.sky, SKY_UNIFORMS);
  const calm = finishBuild(gl, pending.calm, LAND_UNIFORMS);
  const rippling = finishBuild(gl, pending.rippling, LAND_UNIFORMS);
  const motes = finishBuild(gl, pending.motes, MOTE_UNIFORMS);
  if (!sky || !calm || !rippling || !motes) {
    for (const linked of [sky, calm, rippling, motes]) {
      if (linked) gl.deleteProgram(linked.program);
    }
    deleteBuffers(gl, pending);
    return null;
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0, 0, 0, 0);
  gl.enableVertexAttribArray(0);
  const { triangle, grid, corners, seeds } = pending;
  return { sky, calm, rippling, motes, triangle, grid, corners, seeds };
}

/** How far an eased value moves toward its goal in `elapsed` when it follows with `period`. */
const follow = (elapsed: number, period: number) => 1 - Math.exp(-elapsed / period);

/** Slow at both ends, fast in the middle: the shape of the opening dive. */
const dive = (share: number) =>
  share < 0.5 ? 4 * share * share * share : 1 - Math.pow(-2 * share + 2, 3) / 2;

/**
 * Draws a landscape of contour lines behind the whole page and returns a handle to it, or null
 * when nothing can be drawn. The camera follows a lane through the land: scrolling carries it
 * forward and moves it between one pose per section, the pointer turns it a little and lifts
 * the land it points at, a press sends out a ripple, and the page can tint the scene and send
 * a ring across it. The scene is decorative and never carries data.
 *
 * The page tells the scene two things through attributes. `data-scene-pose` names the pose for
 * a part of the page. `data-scene-clear` marks display type that sits directly on the scene:
 * every time the scene draws it asks where each piece of that type is, and inside its box it
 * draws nothing brighter than the shaders' CLEAR_LIMIT, whatever is lighting the land up. While
 * such type is in front of the sun, the sun is drawn in outline as well.
 *
 * It tries to stay out of the page's way. Its shaders are prepared in the background where the
 * browser allows it. It draws only as often as what is changing needs (see CALM_FRAME_MS):
 * every frame while the camera travels, far fewer while the picture only drifts behind copy.
 *
 * And it watches the page's frames. If they stay slow for STRUGGLE_HOLD_MS, measured against
 * the display's own refresh rate, it steps down through QUALITY_STEPS, and after the last of
 * them stops on a still frame. It cannot tell whether it is the reason the page is slow, so it
 * gives way whenever the page is, and neither step is for good: it steps back up once the page
 * has been smooth again while it was drawing every frame (see RAISE_AFTER_MS), and a stopped
 * scene starts again after a pause (see RESUME_AFTER_MS) or when the page is brought back to
 * the front.
 *
 * Where the visitor asked for reduced motion, and while it is stopped, the scene is a single
 * still frame of the hero's view, flagged with `data-still` so the stylesheet can let it
 * scroll away with the hero instead of staying behind the page.
 *
 * The current level is reflected in `data-quality`: full, reduced, stopped, or off while
 * nothing is drawn (shaders not ready yet, context lost, or no hardware WebGL). `onSettled`
 * is called once, when the scene has drawn its first frame or will not draw at all.
 */
export function mountScene(canvas: HTMLCanvasElement, onSettled: () => void): Scene | null {
  // A software renderer would run these full-screen shaders on the CPU; no scene is the better trade.
  const gl = canvas.getContext('webgl', {
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  });
  const mesh = gridMesh();
  const seeds = randomSeeds();
  let pending = gl ? startStage(gl, mesh, seeds) : null;
  if (!gl || !pending) {
    canvas.dataset.quality = 'off';
    onSettled();
    return null;
  }

  const style = getComputedStyle(canvas);
  const accent = readColor(style, '--accent-rgb', FALLBACK_ACCENT);
  const accentFar = readColor(style, '--accent-far-rgb', FALLBACK_ACCENT_FAR);
  const danger = readColor(style, '--danger-rgb', FALLBACK_DANGER);
  const dangerFar = readColor(style, '--danger-far-rgb', FALLBACK_DANGER_FAR);
  const root = document.documentElement;
  const reducedMotion = reducedMotionQuery();
  const controller = new AbortController();
  const { signal } = controller;
  /** Where this visit's land sits in the noise, so it is different every time. */
  const origin = [0, 1, 2, 3].map(() => Math.random() * 200);

  const pose: Pose = { ...OPENING };
  const target: Pose = { ...OPENING };
  const look = { yaw: 0, pitch: 0 };
  const pointer = { clientX: 0, clientY: 0, present: false };
  const lift = { x: 0, z: 0, strength: 0 };
  const view = {
    focalX: 1,
    focalY: 1,
    sinPitch: 0,
    cosPitch: 1,
    /** Direction the camera faces on the ground, measured from the lane toward its right. */
    heading: 0,
    sinHeading: 0,
    cosHeading: 1,
    nearest: 0,
    farthest: 1,
    /** Half the width of a grid row at distance zero, and how much it grows per unit ahead. */
    half: 1,
    halfStep: 0,
    horizon: 0,
    sunX: 0,
    travel: 0,
    relief: RELIEF,
    drift: [0, 0, 0, 0] as Drift,
  };
  const tint = new Float32Array(3);
  const tintFar = new Float32Array(3);
  const rippleData = new Float32Array(MAX_RIPPLES * 4);
  /** The boxes handed to the shaders, and how much of the canvas each of them covers. */
  const clearData = new Float32Array(MAX_CLEARS * 4);
  const clearCover = new Float32Array(MAX_CLEARS);

  let stage: Stage | null = null;
  let stops: Stop[] = [];
  let clears: Clear[] = [];
  /**
   * Where the display type near the window is drawn at this moment: the left, top, right and
   * bottom edge of each piece's box on the canvas, in CSS pixels, for the first `found` pieces.
   */
  let boxes = new Float32Array(0);
  let found = 0;
  /** How much of the sun is drawn in outline because display type is in front of it, from 0 to 1. */
  let shade = 0;
  let linking = 0;
  let linkDeadline = 0;
  let settled = false;
  let width = 1;
  let height = 1;
  let ripples: Ripple[] = [];
  let ring: { z: number; born: number; alarm: boolean } | null = null;
  let checking = false;
  let mood = 0;
  let moodGoal = 0;
  let cruise = 0;
  let scrollEase = window.scrollY;
  let introStart = 0;
  let brightness = 0;
  let scanStart = Number.NEGATIVE_INFINITY;
  let nextScan = Number.POSITIVE_INFINITY;
  /** Which of QUALITY_STEPS the scene is drawing at. */
  let step = 0;
  let frozen = false;
  let still = false;
  let wasHidden = document.hidden;
  let frame = 0;
  let lastFrame = 0;
  let lastTick = 0;
  /** The latest gaps between animation frames, and how many have been seen since the last start. */
  const gaps = new Float32Array(REFRESH_SAMPLES);
  const ordered = new Float32Array(REFRESH_SAMPLES);
  let gapCount = 0;
  /** The display's refresh interval, as far as the frames seen so far show it (see REFRESH_SAMPLES). */
  let refresh = Number.POSITIVE_INFINITY;
  /** True while something other than the cruise is changing the picture. */
  let lively = true;
  /** True while the camera itself is on the move: the opening, scrolling, or a change of pose. */
  let travelling = true;
  let pace = 0;
  let slowSince = 0;
  let watchFrom = 0;
  /** How long the page has been smooth while the scene was drawing every frame. */
  let smoothFor = 0;
  let raiseAfter = RAISE_AFTER_MS;
  let raisedAt = 0;
  /** How many of RESUME_AFTER_MS have been used up, the timer for the next, and when it last ran. */
  let resumes = 0;
  let resumeTimer = 0;
  let resumedAt = 0;
  /** When the scene last started moving again with a fade; it fades in from then. */
  let wakeStart = Number.NEGATIVE_INFINITY;

  const settle = () => {
    if (settled) return;
    settled = true;
    onSettled();
  };

  const report = () => {
    canvas.dataset.quality = !stage ? 'off' : frozen ? 'stopped' : step > 0 ? 'reduced' : 'full';
  };

  const resize = () => {
    if (!stage) return;
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    const budget = Math.sqrt(MAX_BUFFER_PIXELS / (width * height));
    const ratio = Math.min(DENSITY, budget) * QUALITY_STEPS[step];
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  /** Works out the camera and the grid under it from the pose, the look, and the distance travelled. */
  const aim = () => {
    const aspect = width / height;
    const tanHalf = Math.min(TAN_WIDEST, Math.max(TAN_HALF_VIEW, TAN_HALF_ACROSS / aspect));
    view.focalY = 1 / tanHalf;
    view.focalX = view.focalY / aspect;
    const pitch = pose.pitch + look.pitch;
    view.sinPitch = Math.sin(pitch);
    view.cosPitch = Math.cos(pitch);

    // The camera turns away from the lane until the lane meets the horizon where the pose
    // wants it.
    view.heading = look.yaw - Math.atan(pose.shift / view.focalX);
    view.sinHeading = Math.sin(view.heading);
    view.cosHeading = Math.cos(view.heading);

    // The grid covers the ground between the bottom and the top edge of the screen, with some
    // to spare. When the camera looks almost straight down, the bottom edge sees ground
    // behind it; when the horizon is in view, the far edge is where the land has faded out.
    const halfView = Math.atan(tanHalf);
    const low = Math.min(2.6, Math.max(0.08, pitch + halfView));
    const lowest = pose.height / Math.tan(low);
    view.nearest = lowest * (lowest > 0 ? 0.6 : 1.4) - 1;
    const faded = pose.fog * FADED_OUT;
    const high = pitch - halfView;
    view.farthest = high > 0.05 ? Math.min(faded, (pose.height / Math.tan(high)) * 1.2 + 2) : faded;

    // A row's visible width grows with its depth: its distance ahead, seen at the camera's pitch.
    const perDepth = GRID_MARGIN / view.focalX;
    view.half = perDepth * (pose.height * view.sinPitch + 1);
    view.halfStep = perDepth * view.cosPitch;

    view.horizon =
      Math.abs(pitch) < 1.4
        ? Math.max(-40, Math.min(40, Math.tan(pitch) * view.focalY))
        : 40 * Math.sign(pitch);
    view.sunX = -Math.tan(view.heading) * view.focalX;
    view.travel = cruise + scrollEase * TRAVEL_PER_PIXEL;
    const broad = foldOffset(origin[0], view.travel * BROAD + origin[1]);
    const fine = foldOffset(origin[2], view.travel * FINE + origin[3]);
    view.drift = [broad[0], broad[1], fine[0], fine[1]];
    view.relief = pose.relief * RELIEF;
  };

  /**
   * Finds where the display type the scene stays dim behind is drawn at this moment, relative
   * to the canvas. Layout says roughly where each piece is; the browser is asked only about
   * those near the window, because it alone knows where animation, the pointer and the hero's
   * drift have moved their text to.
   */
  const locate = () => {
    const frame = canvas.getBoundingClientRect();
    const scroll = window.scrollY;
    found = 0;
    for (const clear of clears) {
      // A still canvas scrolls with the page, so everything that can be over it is asked about.
      if (!still && (clear.bottom - scroll < -height || clear.top - scroll > 2 * height)) continue;
      const box = clear.text.getBoundingClientRect();
      // Text that is not being displayed has no box.
      if (box.width === 0 && box.height === 0) continue;
      boxes[found * 4] = box.left - frame.left - CLEAR_PAD;
      boxes[found * 4 + 1] = box.top - frame.top - CLEAR_PAD;
      boxes[found * 4 + 2] = box.right - frame.left + CLEAR_PAD;
      boxes[found * 4 + 3] = box.bottom - frame.top + CLEAR_PAD;
      found += 1;
    }
  };

  /** How much of the sun is behind display type, from 0 to 1. */
  const sunCover = (): number => {
    const centre = ((view.sunX + 1) / 2) * width;
    const horizon = ((1 - view.horizon) / 2) * height;
    const radius = (SUN_RADIUS * height) / 2;
    let cover = 0;
    for (let at = 0; at < found * 4; at += 4) {
      const across =
        Math.min(boxes[at + 2], centre + radius) - Math.max(boxes[at], centre - radius);
      const down = Math.min(boxes[at + 3], horizon) - Math.max(boxes[at + 1], horizon - radius);
      if (across <= 0 || down <= 0) continue;
      // A sliver of overlap shades the sun a little; a real one, all the way.
      cover = Math.max(
        cover,
        Math.min(1, across / (radius * 0.5)) * Math.min(1, down / (radius * 0.3)),
      );
    }
    return cover;
  };

  /**
   * Hands the shaders the boxes to stay dim inside, in buffer pixels from the canvas's bottom
   * left corner. They take MAX_CLEARS; if more pieces of display type are in view than that,
   * the ones covering the most of the canvas are kept.
   */
  const pickClears = () => {
    const across = canvas.width / width;
    const down = canvas.height / height;
    clearData.fill(NOWHERE);
    clearCover.fill(0);
    for (let at = 0; at < found * 4; at += 4) {
      const wide =
        Math.min(boxes[at + 2] + CLEAR_EDGE, width) - Math.max(boxes[at] - CLEAR_EDGE, 0);
      const tall =
        Math.min(boxes[at + 3] + CLEAR_EDGE, height) - Math.max(boxes[at + 1] - CLEAR_EDGE, 0);
      if (wide <= 0 || tall <= 0) continue;
      let slot = 0;
      for (let other = 1; other < MAX_CLEARS; other += 1) {
        if (clearCover[other] < clearCover[slot]) slot = other;
      }
      if (wide * tall <= clearCover[slot]) continue;
      clearCover[slot] = wide * tall;
      clearData[slot * 4] = boxes[at] * across;
      clearData[slot * 4 + 1] = (height - boxes[at + 3]) * down;
      clearData[slot * 4 + 2] = boxes[at + 2] * across;
      clearData[slot * 4 + 3] = (height - boxes[at + 1]) * down;
    }
  };

  /** Finds the ground position, relative to the camera, that a point on the screen looks at. */
  const cast = (clientX: number, clientY: number): { x: number; z: number } | null => {
    const aside = ((clientX / width) * 2 - 1) / view.focalX;
    const up = (1 - (clientY / height) * 2) / view.focalY;
    // Undo the pitch: how much the ray climbs, and how far it runs ahead, per unit of depth.
    const climb = up * view.cosPitch - view.sinPitch;
    const ahead = up * view.sinPitch + view.cosPitch;
    const stepX = aside * view.cosHeading + ahead * view.sinHeading;
    const stepZ = ahead * view.cosHeading - aside * view.sinHeading;
    const clearance = (reach: number) =>
      pose.height +
      climb * reach -
      landHeight(stepX * reach, stepZ * reach, view.drift, view.relief);
    let above = 0;
    for (let reach = 0.4; reach < view.farthest; reach *= 1.2) {
      if (clearance(reach) > 0) {
        above = reach;
        continue;
      }
      let below = reach;
      for (let step = 0; step < 6; step += 1) {
        const middle = (above + below) / 2;
        if (clearance(middle) > 0) above = middle;
        else below = middle;
      }
      return { x: stepX * below, z: stepZ * below };
    }
    return null;
  };

  /**
   * Advances everything that moves and reports whether anything other than the cruise is
   * still changing the picture.
   */
  const compose = (time: number, elapsed: number): boolean => {
    if (!introStart && root.dataset.intro === 'ready') introStart = time;
    const opening = introStart ? Math.min(1, (time - introStart) / INTRO_MS) : 0;
    // A scene that has started moving again somewhere down the page fades in.
    const wake = Math.min(1, Math.max(0, (time - wakeStart) / WAKE_MS));
    brightness = Math.min(1, opening * 5) * wake;

    const scroll = window.scrollY;
    scrollEase += (scroll - scrollEase) * follow(elapsed, SCROLL_EASE_MS);
    if (Math.abs(scroll - scrollEase) < 0.25) scrollEase = scroll;

    poseAt(stops, scrollEase, target);
    let moving = true;
    if (opening < 1) {
      mixPose(OPENING, target, dive(opening), pose);
    } else {
      if (nextScan === Number.POSITIVE_INFINITY) nextScan = time + 900;
      moving = easePose(pose, target, follow(elapsed, POSE_EASE_MS));
    }

    // Where the pointer is turns and tilts the camera a little.
    const aimYaw = pointer.present ? ((pointer.clientX / width) * 2 - 1) * LOOK_YAW : 0;
    const aimPitch = pointer.present ? ((pointer.clientY / height) * 2 - 1) * LOOK_PITCH : 0;
    const turn = follow(elapsed, LOOK_EASE_MS);
    look.yaw += (aimYaw - look.yaw) * turn;
    look.pitch += (aimPitch - look.pitch) * turn;
    const looking =
      Math.abs(aimYaw - look.yaw) > 0.0004 || Math.abs(aimPitch - look.pitch) > 0.0004;

    cruise += elapsed * CRUISE_PER_MS * pose.cruise;
    aim();

    const touched = pointer.present ? cast(pointer.clientX, pointer.clientY) : null;
    let lifting = false;
    if (touched) {
      // A lift that is only just appearing starts under the pointer instead of sliding in.
      const share = lift.strength < 0.02 ? 1 : follow(elapsed, FOLLOW_MS);
      lift.x += (touched.x - lift.x) * share;
      lift.z += (touched.z - lift.z) * share;
      lifting = Math.abs(touched.x - lift.x) > 0.05 || Math.abs(touched.z - lift.z) > 0.05;
    }
    const goal = touched ? 1 : 0;
    lift.strength += (goal - lift.strength) * follow(elapsed, SWELL_MS);
    if (Math.abs(goal - lift.strength) < 0.004) lift.strength = goal;
    else lifting = true;

    if (ripples.length > 0) {
      ripples = ripples.filter((ripple) => time - ripple.born < RIPPLE_LIFE_MS);
    }
    if (ring && time - ring.born >= PULSE_MS) ring = null;
    if (time >= nextScan) {
      scanStart = time;
      nextScan = time + (checking ? CHECK_SCAN_EVERY_MS : SCAN_EVERY_MS);
    }

    mood += (moodGoal - mood) * follow(elapsed, MOOD_EASE_MS);
    const shifting = Math.abs(moodGoal - mood) > 0.002;
    if (!shifting) mood = moodGoal;

    locate();
    const cover = sunCover();
    shade += (cover - shade) * follow(elapsed, SHADE_EASE_MS);
    const shading = Math.abs(cover - shade) > 0.004;
    if (!shading) shade = cover;

    travelling = opening < 1 || scrollEase !== scroll || moving;
    return (
      travelling ||
      looking ||
      lifting ||
      shifting ||
      shading ||
      wake < 1 ||
      ripples.length > 0 ||
      ring !== null
    );
  };

  /** Sets the scene to the one frame it shows when it must not move: the hero's view. */
  const composeStill = () => {
    const hero = poseFor('hero');
    if (hero) mixPose(hero, hero, 0, pose);
    look.yaw = 0;
    look.pitch = 0;
    lift.strength = 0;
    ripples = [];
    ring = null;
    scrollEase = 0;
    brightness = 1;
    mood = moodGoal;
    scanStart = Number.NEGATIVE_INFINITY;
    aim();
    // A still scene scrolls with the page, so what is in front of the sun never changes.
    locate();
    shade = sunCover();
  };

  const draw = (time: number) => {
    if (!stage) return;
    for (let channel = 0; channel < 3; channel += 1) {
      tint[channel] = accent[channel] + (danger[channel] - accent[channel]) * mood;
      tintFar[channel] = accentFar[channel] + (dangerFar[channel] - accentFar[channel]) * mood;
    }
    const strength = pose.strength * brightness;
    const ratio = canvas.width / width;
    pickClears();

    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // The sky goes first and writes no depth, so the land simply covers it. It is only drawn
    // where it can show: from a little below the horizon upward, and not at all once the
    // camera looks down far enough for the horizon to leave the screen.
    const skyFrom = Math.max(
      0,
      Math.floor(((view.horizon - SKY_BELOW_HORIZON + 1) / 2) * canvas.height),
    );
    if (skyFrom < canvas.height) {
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, skyFrom, canvas.width, canvas.height - skyFrom);
      gl.useProgram(stage.sky.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, stage.triangle);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(stage.sky.at.uResolution, canvas.width, canvas.height);
      gl.uniform4f(
        stage.sky.at.uSky,
        view.horizon,
        view.sunX,
        pose.glow * brightness,
        width / height,
      );
      gl.uniform3fv(stage.sky.at.uTint, tint);
      gl.uniform3fv(stage.sky.at.uTintFar, tintFar);
      // The stars turn with the camera: its heading as a distance across the screen.
      gl.uniform3f(stage.sky.at.uStars, view.heading * view.focalY, time * 0.0015, ratio);
      gl.uniform1f(stage.sky.at.uSun, 1 - shade);
      gl.uniform4fv(stage.sky.at.uClear, clearData);
      gl.uniform1f(stage.sky.at.uClearEdge, CLEAR_EDGE * ratio);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
    }

    const depthScale = (FAR + NEAR) / (FAR - NEAR);
    const depthOffset = (-2 * FAR * NEAR) / (FAR - NEAR);
    const land = ripples.length > 0 ? stage.rippling : stage.calm;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.useProgram(land.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, stage.grid);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stage.corners);
    gl.uniform4f(land.at.uGrid, view.nearest, view.farthest, view.half, view.halfStep);
    gl.uniform3f(land.at.uCamera, pose.height, view.sinPitch, view.cosPitch);
    gl.uniform2f(land.at.uHeading, view.sinHeading, view.cosHeading);
    gl.uniform4f(land.at.uLens, view.focalX, view.focalY, depthScale, depthOffset);
    gl.uniform4f(land.at.uDrift, view.drift[0], view.drift[1], view.drift[2], view.drift[3]);
    gl.uniform3f(land.at.uLift, lift.x, lift.z, lift.strength);
    gl.uniform1f(land.at.uRelief, view.relief);
    gl.uniform2f(land.at.uResolution, canvas.width, canvas.height);
    gl.uniform4f(land.at.uLook, strength, ratio, pose.fog, pose.cap);
    gl.uniform3f(land.at.uFade, pose.fadeLow, pose.fadeLeft, pose.fadeTop);
    gl.uniform3fv(land.at.uTint, tint);
    gl.uniform3fv(land.at.uTintFar, tintFar);
    gl.uniform4fv(land.at.uClear, clearData);
    gl.uniform1f(land.at.uClearEdge, CLEAR_EDGE * ratio);

    // The sweep starts at the camera and accelerates away from it.
    const swept = (time - scanStart) / SCAN_MS;
    const sweeping = swept >= 0 && swept <= 1;
    const reach = 0.8 + swept * swept * SCAN_REACH;
    const power = Math.max(pose.scan, checking ? 0.8 : 0) * 0.5;
    gl.uniform3f(
      land.at.uScan,
      sweeping ? reach : 0,
      0.5 + reach * 0.07,
      sweeping ? power * Math.sin(Math.PI * swept) : 0,
    );

    const spread = ring ? Math.min(1, (time - ring.born) / PULSE_MS) : 0;
    gl.uniform4f(
      land.at.uPulse,
      0,
      ring ? ring.z - view.travel : 0,
      Math.pow(spread, 0.8) * PULSE_REACH,
      ring ? (1 - spread) * (1 - spread) : 0,
    );
    gl.uniform3fv(land.at.uPulseTint, ring?.alarm ? danger : accent);

    if (land.at.uRipples) {
      // A negative age marks an unused ripple slot.
      rippleData.fill(-1);
      ripples.forEach((ripple, index) => {
        rippleData[index * 4] = ripple.x;
        rippleData[index * 4 + 1] = ripple.z - view.travel;
        rippleData[index * 4 + 2] = Math.max(0, time - ripple.born);
        rippleData[index * 4 + 3] = ripple.scale;
      });
      gl.uniform4fv(land.at.uRipples, rippleData);
    }
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawElements(gl.TRIANGLES, mesh.corners.length, gl.UNSIGNED_SHORT, 0);

    // The points of light are hidden by the land in front of them but never hide anything.
    gl.depthMask(false);
    gl.useProgram(stage.motes.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, stage.seeds);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.uniform2f(stage.motes.at.uResolution, canvas.width, canvas.height);
    gl.uniform3f(stage.motes.at.uCamera, pose.height, view.sinPitch, view.cosPitch);
    gl.uniform2f(stage.motes.at.uHeading, view.sinHeading, view.cosHeading);
    gl.uniform4f(stage.motes.at.uLens, view.focalX, view.focalY, depthScale, depthOffset);
    gl.uniform3f(stage.motes.at.uDust, view.travel % MOTE_DEPTH, time * 0.001, 15 * ratio);
    gl.uniform4f(stage.motes.at.uMote, tint[0], tint[1], tint[2], 0.5 * strength);
    gl.uniform4fv(stage.motes.at.uClear, clearData);
    gl.uniform1f(stage.motes.at.uClearEdge, CLEAR_EDGE * ratio);
    gl.drawArrays(gl.POINTS, 0, MOTE_COUNT);
  };

  /** Repaints whatever the scene is showing, for when the canvas was cleared under it. */
  const repaint = () => {
    if (still) composeStill();
    draw(lastFrame);
  };

  const sync = () => {
    // Coming back to the front is a fresh chance for a scene that had stopped, and gives it
    // every one of its own tries back.
    if (wasHidden && !document.hidden && frozen) {
      window.clearTimeout(resumeTimer);
      resumeTimer = 0;
      resumes = 0;
      frozen = false;
      report();
    }
    wasHidden = document.hidden;
    const nowStill = reducedMotion.matches || frozen;
    if (nowStill !== still) {
      still = nowStill;
      canvas.toggleAttribute('data-still', still);
      // The stylesheet gives a still canvas a different box, so it has to be measured again.
      resize();
      if (!still) {
        // Moving again: take up the view for where the page is now. At the top of the page
        // that is the view the still picture showed. Anywhere else the picture changes, and
        // the scene fades in from dark rather than cut from one picture to another.
        scrollEase = window.scrollY;
        poseAt(stops, scrollEase, pose);
        if (scrollEase > 0) {
          brightness = 0;
          wakeStart = performance.now();
        }
      }
      repaint();
    }
    const animate = stage !== null && !document.hidden && !still;
    if (animate && !frame) {
      // Whatever came before a pause says nothing about the pace from here on.
      lastTick = 0;
      gapCount = 0;
      lastFrame = 0;
      pace = 0;
      slowSince = 0;
      smoothFor = 0;
      lively = true;
      watchFrom = performance.now() + (watchFrom ? RESTART_SETTLE_MS : SETTLE_MS);
      frame = requestAnimationFrame(tick);
    }
    if (!animate && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  /** Moves to another of QUALITY_STEPS. */
  const setStep = (next: number) => {
    step = next;
    pace = 0;
    slowSince = 0;
    smoothFor = 0;
    report();
    resize();
    // Resizing clears the canvas, so repaint now rather than show an empty frame.
    repaint();
  };

  /** Starts a stopped scene again, to find out whether what slowed the page has passed. */
  const resume = () => {
    resumeTimer = 0;
    if (!frozen) return;
    frozen = false;
    resumedAt = performance.now();
    report();
    sync();
  };

  const stop = () => {
    frozen = true;
    resumedAt = 0;
    report();
    sync();
    if (resumes < RESUME_AFTER_MS.length) {
      resumeTimer = window.setTimeout(resume, RESUME_AFTER_MS[resumes]);
      resumes += 1;
    }
  };

  /** Gives up some quality because the page's frames have stayed slow. */
  const degrade = (time: number) => {
    // A step up that is followed this soon by slow frames came too early: wait longer next time.
    if (raisedAt && time - raisedAt < RAISE_TRIAL_MS) {
      raiseAfter = Math.min(raiseAfter * RAISE_BACKOFF, RAISE_AFTER_MAX_MS);
    }
    raisedAt = 0;
    if (step === QUALITY_STEPS.length - 1) stop();
    else setStep(step + 1);
  };

  /**
   * Judges the page's own frame rate, whether or not the scene drew on this frame. `busy` says
   * whether the scene is drawing as often as it ever does, which is when its cost shows.
   */
  const watchPace = (time: number, gap: number, busy: boolean) => {
    const slow = Math.min(SLOW_FRAME_MS, Math.max(SMOOTH_FRAME_MS, refresh * STRUGGLE_SHARE));
    pace += (Math.min(gap, PACE_CAP_MS) - pace) * PACE_EASE;
    // A second start, or a step up, that has lasted this long was not too early.
    if (resumedAt && time - resumedAt >= RESUME_TRIAL_MS) {
      resumes = 0;
      resumedAt = 0;
    }
    if (raisedAt && time - raisedAt >= RAISE_TRIAL_MS) {
      raiseAfter = RAISE_AFTER_MS;
      raisedAt = 0;
    }
    if (pace > slow) {
      smoothFor = 0;
      if (!slowSince) slowSince = time;
      else if (time - slowSince >= STRUGGLE_HOLD_MS) degrade(time);
      return;
    }
    slowSince = 0;
    if (step === 0 || !busy) return;
    if (pace > refresh * SMOOTH_SHARE) {
      smoothFor = 0;
      return;
    }
    smoothFor += Math.min(gap, PACE_CAP_MS);
    if (smoothFor < raiseAfter) return;
    raisedAt = time;
    setStep(step - 1);
  };

  function tick(time: number) {
    frame = requestAnimationFrame(tick);
    const gap = lastTick ? time - lastTick : 0;
    lastTick = time;
    if (gap) {
      gaps[gapCount % REFRESH_SAMPLES] = gap;
      gapCount += 1;
      if (gapCount >= REFRESH_SAMPLES) {
        ordered.set(gaps);
        ordered.sort();
        refresh = Math.min(refresh, Math.max(4, ordered[REFRESH_SAMPLES >> 1]));
      }
    }
    // Until the opening starts, the curtain hides the scene and nothing in it changes.
    if (!introStart && root.dataset.intro !== 'ready') return;
    if (window.scrollY !== scrollEase) {
      lively = true;
      travelling = true;
    }
    const elapsed = time - lastFrame;
    const covered = pose.cap < COVERED_CAP;
    const wait =
      travelling || (lively && !covered)
        ? MIN_FRAME_MS
        : lively || !covered
          ? CALM_FRAME_MS
          : COVERED_FRAME_MS;
    if (elapsed >= wait) {
      lastFrame = time;
      // After a pause the picture picks up where it was instead of leaping ahead.
      lively = compose(time, Math.min(elapsed, 100));
      draw(time);
    }
    if (gap && time >= watchFrom) watchPace(time, gap, wait === MIN_FRAME_MS);
  }

  const measure = () => {
    stops = measureStops(document);
    clears = Array.from(document.querySelectorAll<HTMLElement>('[data-scene-clear]'), (element) => {
      const text = document.createRange();
      text.selectNodeContents(element);
      return { text, ...layoutSpan(element) };
    });
    boxes = new Float32Array(clears.length * 4);
    locate();
    lively = true;
    // A still frame is not drawn again by itself, and what it stays dim behind may have moved.
    if (still) repaint();
  };

  /** Waits, without holding the page up, for the programs to link; then starts drawing. */
  const awaitStage = () => {
    linking = 0;
    if (!pending) return;
    if (!hasLinked(gl, pending) && performance.now() < linkDeadline) {
      linking = requestAnimationFrame(awaitStage);
      return;
    }
    stage = finishStage(gl, pending);
    pending = null;
    report();
    resize();
    measure();
    still = reducedMotion.matches;
    canvas.toggleAttribute('data-still', still);
    if (still) resize();
    else compose(performance.now(), 0);
    repaint();
    sync();
    settle();
  };

  const prepare = () => {
    linkDeadline = performance.now() + LINK_PATIENCE_MS;
    awaitStage();
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.present = true;
      lively = true;
    },
    { passive: true, signal },
  );
  root.addEventListener(
    'pointerleave',
    () => {
      pointer.present = false;
      lively = true;
    },
    { signal },
  );
  window.addEventListener(
    'pointerdown',
    (event) => {
      // A still scene does not take ripples.
      if (!frame) return;
      const touched = cast(event.clientX, event.clientY);
      if (!touched) return;
      ripples.push({
        x: touched.x,
        z: touched.z + view.travel,
        born: performance.now(),
        scale: rippleScale(Math.hypot(touched.x, touched.z)),
      });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
      lively = true;
    },
    { passive: true, signal },
  );
  window.addEventListener('resize', measure, { passive: true, signal });
  document.addEventListener('visibilitychange', sync, { signal });
  reducedMotion.addEventListener('change', sync, { signal });
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      // Without this the browser never offers the context back.
      event.preventDefault();
      cancelAnimationFrame(linking);
      linking = 0;
      // Everything the lost context owned is gone with it.
      pending = null;
      stage = null;
      report();
      sync();
    },
    { signal },
  );
  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      pending = startStage(gl, mesh, seeds);
      prepare();
    },
    { signal },
  );

  // Resizing clears the canvas after this frame's drawing, so it always has to be repainted.
  const sizing = new ResizeObserver(() => {
    resize();
    repaint();
  });
  // Content that grows or shrinks, such as a result appearing, moves the sections' positions.
  const layout = new ResizeObserver(measure);

  report();
  prepare();
  sizing.observe(canvas);
  layout.observe(document.body);
  // A font that arrives late changes how wide the display type is without resizing anything.
  void document.fonts.ready.then(() => {
    if (!signal.aborted) measure();
  });

  return {
    setMood(next) {
      checking = next === 'checking';
      moodGoal = next === 'unavailable' ? 1 : 0;
      if (checking) nextScan = 0;
      lively = true;
      if (still) repaint();
    },
    pulse(kind) {
      // A still scene does not take rings either.
      if (!frame) return;
      ring = { z: view.travel + PULSE_AHEAD, born: performance.now(), alarm: kind === 'invalid' };
      lively = true;
    },
    destroy() {
      controller.abort();
      sizing.disconnect();
      layout.disconnect();
      window.clearTimeout(resumeTimer);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(linking);
      if (pending) {
        for (const build of [pending.sky, pending.calm, pending.rippling, pending.motes]) {
          discardBuild(gl, build);
        }
        deleteBuffers(gl, pending);
      }
      if (stage) {
        for (const linked of [stage.sky, stage.calm, stage.rippling, stage.motes]) {
          gl.deleteProgram(linked.program);
        }
        deleteBuffers(gl, stage);
      }
    },
  };
}
