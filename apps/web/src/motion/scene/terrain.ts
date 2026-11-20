/**
 * The land the scene flies over, described once and used twice: as GLSL for shaping it and as
 * plain functions for finding where the pointer touches it. Both read the same constants.
 */

/** Simplex noise maps points onto a skewed grid of cells and back with these two factors. */
const SKEW = 0.5 * (Math.sqrt(3) - 1);
const UNSKEW = (3 - Math.sqrt(3)) / 6;
/** The lattice hash repeats after this many cells, so an offset can be folded into one period. */
const NOISE_PERIOD = 289;

/** Noise cells per world unit, for the broad shapes and for the detail on top of them. */
export const BROAD = 0.21;
export const FINE = 0.52;
const BROAD_WEIGHT = 0.62;
const FINE_WEIGHT = 0.3;
/** Lifts the land so it mostly stands above the lane instead of dipping below it. */
const RIDGE = 0.55;
/**
 * The lane the camera follows is flat out to LANE_INNER from its centre; from there the land
 * rises, and by LANE_OUTER it has its full height.
 */
const LANE_INNER = 0.7;
const LANE_OUTER = 5.2;
/**
 * The detail fades out between these distances from the camera. Far land is drawn with few
 * grid points, which can hold the broad shapes but would turn the detail into jagged ridges.
 */
const DETAIL_NEAR = 12;
const DETAIL_FAR = 38;
const FADE_SPAN = DETAIL_FAR - DETAIL_NEAR;

/** Height of the land, in world units, at full relief. */
export const RELIEF = 3.3;
/** How far the land rises under the pointer, and how wide that rise is. */
const LIFT_HEIGHT = 0.55;
const LIFT_SPREAD = 2 * 0.9 * 0.9;
/** Ripples the shaders can show at once, and how long one lasts. */
export const MAX_RIPPLES = 4;
export const RIPPLE_LIFE_MS = 3600;
const RIPPLE_SPEED_PER_MS = 0.0036;
const RIPPLE_WIDTH = 0.55;
const RIPPLE_HEIGHT = 0.2;
/**
 * A ripple that starts farther from the camera than RIPPLE_NEAR is made longer in proportion,
 * and as much faster, up to RIPPLE_GROWTH times, so that on screen it is about as long and as
 * quick as one that starts close by. At its ordinary length a ripple near the horizon was a
 * few pixels long and could hardly be seen. Its height stays the same: seen from low over the
 * lane, a taller wave far away reads as a ledge across it.
 */
const RIPPLE_NEAR = 14;
const RIPPLE_GROWTH = 5;

/** How much longer than ordinary a ripple is drawn when it starts this far from the camera. */
export const rippleScale = (distance: number) =>
  Math.min(RIPPLE_GROWTH, Math.max(1, distance / RIPPLE_NEAR));

/** Folded noise offsets of the two octaves: broad x and y, then fine x and y. */
export type Drift = readonly [number, number, number, number];

/** Writes a number as a GLSL float literal, which must contain a decimal point or an exponent. */
export const float = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value));

const wrap = (cell: number) => ((cell % NOISE_PERIOD) + NOISE_PERIOD) % NOISE_PERIOD;
const permute = (value: number) => ((34 * value + 1) * value) % NOISE_PERIOD;

/** One lattice corner's share of the noise at an offset from that corner. */
function corner(cellX: number, cellY: number, x: number, y: number): number {
  const falloff = 0.5 - x * x - y * y;
  if (falloff <= 0) return 0;
  const around = permute(permute(wrap(cellX)) + wrap(cellY)) * (4 / NOISE_PERIOD);
  const across = Math.abs(around - 2) - 1;
  const up = (1 - Math.abs(across)) * (around < 2 ? 1 : -1);
  const squared = falloff * falloff;
  return (squared * squared * (across * x + up * y)) / Math.hypot(across, up);
}

/** Two-dimensional simplex noise: the value the shader's `simplex()` returns in z. */
function simplex(pointX: number, pointY: number): number {
  const skew = (pointX + pointY) * SKEW;
  const cellX = Math.floor(pointX + skew);
  const cellY = Math.floor(pointY + skew);
  const unskew = (cellX + cellY) * UNSKEW;
  const x = pointX - cellX + unskew;
  const y = pointY - cellY + unskew;
  const sideX = x > y ? 1 : 0;
  const sideY = 1 - sideX;
  return (
    70 *
    (corner(cellX, cellY, x, y) +
      corner(cellX + sideX, cellY + sideY, x - sideX + UNSKEW, y - sideY + UNSKEW) +
      corner(cellX + 1, cellY + 1, x - 1 + 2 * UNSKEW, y - 1 + 2 * UNSKEW))
  );
}

const smooth = (share: number) => share * share * (3 - 2 * share);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Height of the undisturbed land at a ground position relative to the camera: what the
 * shader's `terrain()` returns in z before the pointer and ripples are added.
 */
export function landHeight(x: number, z: number, drift: Drift, relief: number): number {
  const rise = smooth(clamp01((Math.abs(x) - LANE_INNER) / (LANE_OUTER - LANE_INNER)));
  if (rise === 0) return 0;
  const detail = 1 - smooth(clamp01((Math.hypot(x, z) - DETAIL_NEAR) / FADE_SPAN));
  const rough =
    RIDGE +
    BROAD_WEIGHT * simplex(x * BROAD + drift[0], z * BROAD + drift[1]) +
    FINE_WEIGHT * detail * simplex(x * FINE + drift[2], z * FINE + drift[3]);
  return relief * rise * rough;
}

/**
 * The noise repeats exactly whenever its skewed cell coordinates move by a whole period, so an
 * offset can be folded back into one period without changing the picture. Doing that here in
 * double precision keeps the shader's single-precision positions small, and the land steady,
 * however far the camera has travelled.
 */
export function foldOffset(x: number, y: number): [number, number] {
  const skew = (x + y) * SKEW;
  const cellX = (x + skew) % NOISE_PERIOD;
  const cellY = (y + skew) % NOISE_PERIOD;
  const unskew = (cellX + cellY) * UNSKEW;
  return [cellX - unskew, cellY - unskew];
}

/**
 * The ripple terms. Only compiled into the program that is used while a ripple is alive. Each
 * ripple is its centre, its age in milliseconds (negative for a slot that is not in use), and
 * the scale it was given when it started.
 */
const RIPPLE_TERMS = `
  for (int index = 0; index < ${MAX_RIPPLES}; index++) {
    vec4 ripple = uRipples[index];
    if (ripple.z < 0.0) continue;
    vec2 fromCentre = ground - ripple.xy;
    float radius = length(fromCentre);
    // How far ahead of the ring this point is, in units of the ripple's own length.
    float ahead = (radius - ripple.z * ${float(RIPPLE_SPEED_PER_MS)} * ripple.w) / ripple.w;
    float envelope =
      ${float(RIPPLE_HEIGHT)} * exp(-ripple.z / 1100.0) *
      exp(-ahead * ahead / ${float(2 * RIPPLE_WIDTH * RIPPLE_WIDTH)});
    float phase = ahead * ${float(2.4 / RIPPLE_WIDTH)};
    height += envelope * cos(phase);
    float steepness =
      envelope / ripple.w *
      (-ahead / ${float(RIPPLE_WIDTH * RIPPLE_WIDTH)} * cos(phase) -
        ${float(2.4 / RIPPLE_WIDTH)} * sin(phase));
    slope += steepness * fromCentre / max(radius, 0.001);
  }
`;

/**
 * GLSL for `terrain(ground)`, used by the vertex shader that shapes the land. Every term also
 * contributes its exact slope, which the land is lit by.
 *
 * The lattice gradients come from an arithmetic hash (the permutation polynomial that Stefan
 * Gustavson and Ian McEwan's textureless noise made common), so no texture lookup is needed.
 * The hash only handles integers below 2^24, which a float holds exactly, and `landHeight()`
 * above repeats it step for step.
 */
export function terrainGlsl(withRipples: boolean): string {
  return `
uniform vec4 uDrift;
uniform vec3 uLift;
uniform float uRelief;
${withRipples ? `uniform vec4 uRipples[${MAX_RIPPLES}];` : ''}

const float SKEW = ${SKEW};
const float UNSKEW = ${UNSKEW};

float permute(float value) {
  return mod((34.0 * value + 1.0) * value, ${float(NOISE_PERIOD)});
}

// A unit vector for one lattice point: a hashed position around a diamond, pushed out to a circle.
vec2 gradientAt(vec2 cell) {
  cell = mod(cell, ${float(NOISE_PERIOD)});
  float around = permute(permute(cell.x) + cell.y) * ${float(4 / NOISE_PERIOD)};
  float across = abs(around - 2.0) - 1.0;
  return normalize(vec2(across, (1.0 - abs(across)) * (around < 2.0 ? 1.0 : -1.0)));
}

// Two-dimensional simplex noise. Returns the slope in xy and the value in z.
vec3 simplex(vec2 point) {
  vec2 cell = floor(point + (point.x + point.y) * SKEW);
  vec2 offset0 = point - cell + (cell.x + cell.y) * UNSKEW;
  vec2 side = offset0.x > offset0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 offset1 = offset0 - side + UNSKEW;
  vec2 offset2 = offset0 - 1.0 + 2.0 * UNSKEW;
  vec2 gradient0 = gradientAt(cell);
  vec2 gradient1 = gradientAt(cell + side);
  vec2 gradient2 = gradientAt(cell + 1.0);
  vec3 falloff = max(
    0.5 - vec3(dot(offset0, offset0), dot(offset1, offset1), dot(offset2, offset2)),
    0.0
  );
  vec3 falloff3 = falloff * falloff * falloff;
  vec3 falloff4 = falloff3 * falloff;
  vec3 along = vec3(dot(gradient0, offset0), dot(gradient1, offset1), dot(gradient2, offset2));
  vec3 pull = -8.0 * falloff3 * along;
  vec2 slope =
    falloff4.x * gradient0 + pull.x * offset0 +
    falloff4.y * gradient1 + pull.y * offset1 +
    falloff4.z * gradient2 + pull.z * offset2;
  return 70.0 * vec3(slope, dot(falloff4, along));
}

// Slope (xy) and height (z) of the land at a ground position relative to the camera.
vec3 terrain(vec2 ground) {
  vec3 broad = simplex(ground * ${float(BROAD)} + uDrift.xy);
  vec3 fine = simplex(ground * ${float(FINE)} + uDrift.zw);

  // The detail thins out with distance from the camera.
  float away = max(length(ground), 0.001);
  float fade = clamp((away - ${float(DETAIL_NEAR)}) / ${float(FADE_SPAN)}, 0.0, 1.0);
  float detail = 1.0 - fade * fade * (3.0 - 2.0 * fade);
  vec2 detailSlope = ${float(-6 / FADE_SPAN)} * fade * (1.0 - fade) * ground / away;

  float rough =
    ${float(RIDGE)} + ${float(BROAD_WEIGHT)} * broad.z + ${float(FINE_WEIGHT)} * detail * fine.z;
  vec2 roughSlope =
    ${float(BROAD_WEIGHT * BROAD)} * broad.xy +
    ${float(FINE_WEIGHT)} * (detail * ${float(FINE)} * fine.xy + detailSlope * fine.z);

  // The lane the camera follows is flat; the land rises on both sides of it.
  float side = clamp(
    (abs(ground.x) - ${float(LANE_INNER)}) / ${float(LANE_OUTER - LANE_INNER)},
    0.0,
    1.0
  );
  float rise = side * side * (3.0 - 2.0 * side);
  float riseSlope =
    ${float(6 / (LANE_OUTER - LANE_INNER))} * side * (1.0 - side) * sign(ground.x);
  float height = uRelief * rise * rough;
  vec2 slope = uRelief * (rise * roughSlope + vec2(riseSlope * rough, 0.0));

  vec2 fromLift = ground - uLift.xy;
  float lift =
    uLift.z * ${float(LIFT_HEIGHT)} * exp(-dot(fromLift, fromLift) / ${float(LIFT_SPREAD)});
  height += lift;
  slope -= lift * ${float(2 / LIFT_SPREAD)} * fromLift;
${withRipples ? RIPPLE_TERMS : ''}
  return vec3(slope, height);
}
`;
}
