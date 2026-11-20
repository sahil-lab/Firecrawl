import { float, terrainGlsl } from './terrain';

/**
 * The land is a grid of points, packed toward the camera. It is as coarse as the land's
 * shapes allow, because every extra triangle makes the GPU shade the pixels along its edges
 * again. The points still fit the 16-bit indices that plain WebGL can address.
 */
export const GRID_COLUMNS = 168;
export const GRID_ROWS = 264;
const GRID_POWER = 2.2;
/** Drifting points of light, and the box around the camera they live in. */
export const MOTE_COUNT = 420;
export const MOTE_DEPTH = 36;
const MOTE_BEHIND = 6;
const MOTE_WIDTH = 36;
const MOTE_HEIGHT = 3.6;
/** Height difference between neighbouring contour lines, and how often a line is drawn stronger. */
const LEVEL_STEP = 0.17;
const MAJOR_EVERY = 5;
/** How far around the pointer the lines brighten, in world units. */
const GLOW_REACH = 2.6;
/** Radius of the ring drawn on the land around the pointer. */
const BOUNDARY_RING = 0.7;
/** Distance from the lane's centre of the two bright rails that run along it to the horizon. */
const RAIL = 0.56;
/** Width of the ring that crosses the land when a request has been checked. */
const PULSE_WIDTH = 1.1;
/** Rings around the sun per unit of half the screen's height. The first is the sun's own rim. */
const SKY_RINGS = 6;
/** Radius of the sun, as a share of half the screen's height. */
export const SUN_RADIUS = 1 / SKY_RINGS;
/** Colour of unlit land: the page's ink, so the land and the page meet without a seam. */
const SURFACE = [0.031, 0.043, 0.035];
/** Direction the light comes from: low, from where the lane meets the horizon. */
const LIGHT = [0.25, 0.45, 1].map((part) => part / Math.hypot(0.25, 0.45, 1));
/** How many boxes of display type the scene can stay dim behind at once. */
export const MAX_CLEARS = 4;
/**
 * Behind display type that sits directly on the scene, no colour channel is drawn brighter
 * than this. The brightest colour that leaves is a mid grey, and both colours the page sets
 * display type in stay more than 3:1 away from it.
 */
const CLEAR_LIMIT = 0.46;

const vec3 = (parts: number[]) => `vec3(${parts.map(float).join(', ')})`;

/**
 * Where the page's display type is. `uClear` holds one box for each piece of it, as its left,
 * bottom, right and top edge in buffer pixels; a slot that is not in use holds a box far off
 * screen. `uClearEdge` is how far around a box the scene takes to return to full brightness.
 */
const CLEAR = `
uniform vec4 uClear[${MAX_CLEARS}];
uniform float uClearEdge;

// How far outside the nearest box a buffer pixel is. Negative inside one.
float outsideClear(vec2 pixel) {
  float nearest = 100000.0;
  for (int index = 0; index < ${MAX_CLEARS}; index += 1) {
    vec2 beyond = max(uClear[index].xy - pixel, pixel - uClear[index].zw);
    nearest = min(nearest, max(beyond.x, beyond.y));
  }
  return nearest;
}
`;

/** Dims a colour inside those boxes until its brightest channel is down to CLEAR_LIMIT. */
const LEGIBLE = `
vec3 legible(vec3 color) {
  float inside = 1.0 - clamp(outsideClear(gl_FragCoord.xy) / uClearEdge, 0.0, 1.0);
  float brightest = max(color.r, max(color.g, color.b));
  return color * mix(1.0, min(1.0, ${float(CLEAR_LIMIT)} / max(brightest, 0.001)), inside);
}
`;

/** One triangle that covers the whole viewport. */
export const SKY_VERTEX = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * The light behind the land: a sun where the lane meets the horizon with thin rings around it,
 * a band along the horizon, and a few stars above. `uSky` holds the horizon's height and the
 * sun's position in clip space, the brightness, and the aspect ratio. `uStars` holds how far
 * the camera has turned, the time, and the buffer pixels per CSS pixel. `uSun` is 1 while the
 * sun is in the clear and falls to 0 as display type moves in front of it.
 */
export const SKY_FRAGMENT = `
precision highp float;

uniform vec2 uResolution;
uniform vec4 uSky;
uniform vec3 uTint;
uniform vec3 uTintFar;
uniform vec3 uStars;
uniform float uSun;
${CLEAR}${LEGIBLE}
const float SUN = ${float(SUN_RADIUS)};

void main() {
  vec2 clip = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
  float above = clip.y - uSky.x;
  vec2 fromSun = vec2((clip.x - uSky.y) * uSky.w, above);
  float spread = dot(fromSun, fromSun);
  float radius = sqrt(spread);
  // One buffer pixel, in the units the sun is measured in.
  float pixel = 2.0 / uResolution.y;
  float risen = smoothstep(0.0, 2.0 * pixel, above);

  // With display type in front of it the sun is drawn in outline: its fill, and the brightest
  // of the light around it, give way rather than be cut off at the edge of the type's box.
  float fill = mix(0.1, 1.0, uSun);
  float flare = mix(0.35, 1.0, uSun);

  float core = exp(-spread * 5.5);
  float halo = exp(-spread * 0.8);
  float band = exp(-abs(above) * (above > 0.0 ? 7.0 : 24.0)) * exp(-spread * 0.35);
  // A thin streak of light along the horizon, the way a lens draws a bright point.
  float streak = exp(-abs(above) * 70.0) * exp(-fromSun.x * fromSun.x * 1.6);
  vec3 light =
    uTint * ((0.3 * core + 0.3 * streak) * flare + 0.2 * band) +
    uTintFar * (0.1 * halo + 0.07 * band);

  // The sun is a disc that the horizon cuts in half, brightest at its top.
  float height = clamp(above / SUN, 0.0, 1.0);
  float disc = (1.0 - smoothstep(SUN - pixel, SUN + pixel, radius)) * risen;
  light += mix(uTintFar, uTint, height) * disc * (0.2 + 0.32 * height) * fill;

  // Rings spread from it like a signal, fainter the farther out they are.
  float toRing =
    abs(fract(radius * ${float(SKY_RINGS)} - 0.5) - 0.5) / (${float(SKY_RINGS)} * pixel);
  float rings =
    clamp(0.5 * uStars.z + 0.5 - toRing, 0.0, 1.0) * exp((SUN - radius) * 2.4) * risen *
    step(0.5 * SUN, radius);
  light += uTint * rings * 0.32;

  // One star at most in each cell of a grid that turns with the camera.
  vec2 sky = vec2(clip.x * uSky.w + uStars.x, above) * 34.0;
  float chance = fract(sin(dot(floor(sky), vec2(12.9898, 78.233))) * 43758.5453);
  vec2 spot = fract(sky) - 0.5 - (vec2(fract(chance * 17.0), fract(chance * 91.0)) - 0.5) * 0.7;
  float star =
    step(0.93, chance) * (1.0 - smoothstep(0.0, 0.1, length(spot))) *
    smoothstep(0.03, 0.55, above) * (0.3 + 0.7 * fract(chance * 7.0)) *
    (0.72 + 0.28 * sin(uStars.y + chance * 60.0)) * (1.0 - disc);
  light += vec3(0.82, 0.95, 0.88) * star * 0.55;

  light = legible(light * uSky.z);
  gl_FragColor = vec4(light, clamp(max(light.r, max(light.g, light.b)), 0.0, 1.0));
}
`;

/**
 * Projects a point given by its distance ahead of the camera, its distance to the side, and
 * its height above the camera. `uCamera` holds the camera's height and the sine and cosine of
 * how far it looks down; `uLens` holds the two focal lengths and the depth scale and offset.
 */
const PROJECT = `
vec4 project(float ahead, float aside, float above) {
  float depth = ahead * uCamera.z - above * uCamera.y;
  return vec4(
    aside * uLens.x,
    (above * uCamera.z + ahead * uCamera.y) * uLens.y,
    depth * uLens.z + uLens.w,
    depth
  );
}
`;

/**
 * Shapes the land. The grid follows the camera and turns with it, and is laid out to just
 * cover what the camera can see: `uGrid` holds its nearest and farthest distance ahead, the
 * half width of a row at distance zero, and how much wider a row gets with every unit of
 * distance. `uHeading` is the direction the camera faces on the ground.
 *
 * The height and slope are worked out here, once per grid point, and handed to the fragment
 * shader. Contour lines drawn from them follow the grid's own surface exactly; lines worked
 * out again per pixel would not, and came out ragged wherever the grid is coarse.
 */
export function landVertex(withRipples: boolean): string {
  return `
attribute vec2 aGrid;

uniform vec4 uGrid;
uniform vec3 uCamera;
uniform vec2 uHeading;
uniform vec4 uLens;
${terrainGlsl(withRipples)}
varying vec2 vGround;
varying vec3 vLand;
${PROJECT}
void main() {
  // Rows are packed toward the camera, where a step on the ground covers the most pixels.
  float ahead = uGrid.x + (uGrid.y - uGrid.x) * pow(aGrid.y, ${float(GRID_POWER)});
  float aside = (aGrid.x * 2.0 - 1.0) * max(uGrid.z + uGrid.w * ahead, 0.5);
  vGround = ahead * uHeading + aside * vec2(uHeading.y, -uHeading.x);
  vLand = terrain(vGround);
  gl_Position = project(ahead, aside, vLand.z - uCamera.x);
}
`;
}

/**
 * Draws the land: a dark surface that hides whatever is behind it, and on it the contour lines
 * of its own height. Screen-space derivatives give every line an even, anti-aliased width at
 * any distance.
 *
 * `uLook` holds the line strength, the buffer pixels per CSS pixel, the distance at which the
 * land fades into the sky, and the brightest any line may get. `uFade` holds the strength kept
 * at the bottom and left edges and how far up the screen the fade from the bottom reaches.
 * `uScan` is the sweep that crosses the land (distance, width, strength), and `uPulse` the ring
 * sent out when a request has been checked (centre, radius, strength).
 */
export const LAND_FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform vec2 uResolution;
uniform vec3 uCamera;
uniform vec3 uLift;
uniform float uRelief;
uniform vec4 uLook;
uniform vec3 uFade;
uniform vec3 uTint;
uniform vec3 uTintFar;
uniform vec3 uScan;
uniform vec4 uPulse;
uniform vec3 uPulseTint;
${CLEAR}${LEGIBLE}
varying vec2 vGround;
varying vec3 vLand;

// Coverage of an anti-aliased line, given the gap to its centre in buffer pixels.
float line(float gap, float halfWidth) {
  return clamp(halfWidth + 0.5 - gap, 0.0, 1.0);
}

// How far, in buffer pixels, this pixel is from where a value crosses zero.
float pixelsTo(float value) {
  return abs(value) / max(length(vec2(dFdx(value), dFdy(value))), 0.00001);
}

void main() {
  vec3 fromCamera = vec3(vGround.x, vLand.z - uCamera.x, vGround.y);
  float reach = length(fromCamera);
  float haze = exp(-pow(reach / uLook.z, 1.6));

  // Lines sit half way between whole levels, so flat ground at height zero never carries one.
  float level = vLand.z / ${float(LEVEL_STEP)};
  // How many contour levels one buffer pixel spans here.
  float span = max(length(vec2(dFdx(level), dFdy(level))), 0.00001);
  float toLine = abs(fract(level) - 0.5) / span;
  float toMajorLine =
    abs(fract(level / ${float(MAJOR_EVERY)}) - 0.5) * ${float(MAJOR_EVERY)} / span;

  float fromLift = length(vGround - uLift.xy);
  float glow = uLift.z * (1.0 - smoothstep(0.0, ${float(GLOW_REACH)}, fromLift));
  float sweep = uScan.z * exp(-pow((reach - uScan.x) / uScan.y, 2.0));
  float burst =
    uPulse.w *
    exp(-pow((length(vGround - uPulse.xy) - uPulse.z) / ${float(PULSE_WIDTH)}, 2.0));

  // Lines are a little heavier close to the camera, which reads as depth.
  float halfWidth = (0.5 + 0.25 * glow) * uLook.y * mix(1.45, 1.0, smoothstep(2.0, 14.0, reach));
  float soft = 3.5 * uLook.y;
  // Where lines would crowd closer than a few pixels they fade instead of merging: first the
  // ordinary ones, and only much farther away the stronger ones.
  float minor =
    line(toLine, halfWidth) * (0.3 + 0.6 * glow) * (1.0 - smoothstep(0.22, 0.5, span));
  float major =
    line(toMajorLine, halfWidth * 1.3) * (0.72 + 0.28 * glow) *
    (1.0 - smoothstep(1.1, 2.5, span));
  float ink = max(minor, major);
  // Where a stronger line has room around it, it also casts a soft halo, like a lit tube.
  ink +=
    0.17 * (1.0 + glow) * (1.0 - smoothstep(0.1, 0.3, span)) *
    exp(-toMajorLine * toMajorLine / (2.0 * soft * soft));
  // High ground is brighter than low ground.
  ink *= 0.5 + 0.8 * smoothstep(0.02, 1.0, vLand.z / max(uRelief, 0.001));

  // Two rails mark the edges of the lane all the way to the horizon, and a ring marks the
  // ground the pointer is over. Like the contour lines, both keep an even width on screen.
  float toRail = pixelsTo(abs(vGround.x) - ${float(RAIL)});
  ink = max(
    ink,
    0.62 * line(toRail, halfWidth * 1.2) + 0.2 * exp(-toRail * toRail / (2.0 * soft * soft))
  );
  ink = max(ink, uLift.z * line(pixelsTo(fromLift - ${float(BOUNDARY_RING)}), halfWidth * 1.2));
  ink *= haze * (1.0 + 2.2 * sweep + 3.0 * burst);

  // The picture is calmer toward the bottom and the left, where the hero's copy is.
  vec2 screen = gl_FragCoord.xy / uResolution;
  ink *=
    mix(uFade.x, 1.0, smoothstep(0.02, uFade.z, screen.y)) *
    mix(uFade.y, 1.0, clamp(screen.x / 0.62, 0.0, 1.0));
  ink = min(ink * uLook.x, uLook.w);

  vec3 normal = normalize(vec3(-vLand.x, 1.0, -vLand.y));
  // The light is ahead of the camera, so what faces it glances off the edges of the land.
  float rim = pow(1.0 - max(dot(normal, -fromCamera / reach), 0.0), 3.0);
  float lit = max(dot(normal, ${vec3(LIGHT)}), 0.0);
  // Low ground far away holds a little of the horizon's light, like mist in a valley.
  float mist = exp(-max(vLand.z, 0.0) * 1.3) * smoothstep(5.0, 38.0, reach);
  // Lines shift from the accent colour to a cooler one with distance.
  vec3 tint = mix(uTint, uTintFar, smoothstep(5.0, 26.0, reach));
  vec3 surface =
    ${vec3(SURFACE)} +
    tint * (0.045 * lit + 0.08 * rim + 0.06 * mist + 0.07 * sweep) * uLook.x +
    uPulseTint * 0.1 * burst;
  vec3 color =
    legible(mix(surface, mix(tint, uPulseTint, clamp(burst * 1.5, 0.0, 1.0)), ink));

  // Far land dissolves into the sky behind it.
  float solid = smoothstep(0.02, 0.3, haze);
  gl_FragColor = vec4(color * solid, solid);
}
`;

/**
 * Places the drifting points of light. Each keeps its place in a box that wraps around the
 * camera, so there are always some in view however far the camera travels. `uDust` holds how
 * far the camera has travelled (folded into the box), the time in seconds, and the point size.
 * A point is not drawn where any of it would be behind display type.
 */
export const MOTE_VERTEX = `
attribute vec3 aSeed;

uniform vec2 uResolution;
uniform vec3 uCamera;
uniform vec2 uHeading;
uniform vec4 uLens;
uniform vec3 uDust;
${CLEAR}
varying float vGlow;
${PROJECT}
void main() {
  float along =
    mod(aSeed.z * ${float(MOTE_DEPTH)} - uDust.x, ${float(MOTE_DEPTH)}) - ${float(MOTE_BEHIND)};
  vec2 ground = vec2(
    (aSeed.x - 0.5) * ${float(MOTE_WIDTH)} + 0.2 * sin(uDust.y * 0.4 + aSeed.x * 40.0),
    along
  );
  float above =
    0.25 + aSeed.y * ${float(MOTE_HEIGHT)} + 0.12 * sin(uDust.y * 0.6 + aSeed.y * 30.0) -
    uCamera.x;
  float ahead = dot(ground, uHeading);
  gl_Position = project(ahead, dot(ground, vec2(uHeading.y, -uHeading.x)), above);
  gl_PointSize = clamp(uDust.z / max(gl_Position.w, 0.1), 1.0, uDust.z * 0.6);
  vec2 pixel = (gl_Position.xy / max(gl_Position.w, 0.1) * 0.5 + 0.5) * uResolution;
  // A point fades in and out at the two ends of the box, where it wraps, and close to the lens.
  vGlow =
    (0.35 + 0.65 * fract(aSeed.x * 7.0 + aSeed.y * 3.0)) * smoothstep(0.6, 2.2, ahead) *
    smoothstep(${float(-MOTE_BEHIND)}, ${float(3 - MOTE_BEHIND)}, along) *
    (1.0 - smoothstep(${float(MOTE_DEPTH - MOTE_BEHIND - 8)}, ${float(MOTE_DEPTH - MOTE_BEHIND)}, along)) *
    clamp((outsideClear(pixel) - 0.5 * gl_PointSize) / uClearEdge, 0.0, 1.0);
}
`;

export const MOTE_FRAGMENT = `
precision highp float;

uniform vec4 uMote;

varying float vGlow;

void main() {
  float fromCentre = length(gl_PointCoord - 0.5) * 2.0;
  float alpha = (1.0 - smoothstep(0.15, 1.0, fromCentre)) * vGlow * uMote.a;
  gl_FragColor = vec4(uMote.rgb * alpha, alpha * 0.6);
}
`;
