import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AU_KM, getCentralBody } from '../physics';
import { useStore, type BodySizeMode, type Mode } from '../state/store';

/**
 * The single place km become scene units. Physics stays in km (JS doubles);
 * scene coordinates stay O(1-100) so float32 buffers never see 1e8 magnitudes.
 */
export type RadialScale = (rKm: number) => number;

/** Inverse of a RadialScale — scene units back to km. Powers the on-screen ruler. */
export type RadialInverse = (units: number) => number;

export function makeRadialScale(
  mode: Mode,
  compressed: boolean,
  centralBodyRadiusKm = 6378,
): RadialScale {
  if (mode === 'geocentric') {
    return (rKm) => rKm / 1000; // 1 unit = 1,000 km, true scale
  }
  if (mode === 'oberth') {
    // Normalized so any central body — Moon to Sun — renders ~6.4 units across.
    const k = 6.378 / centralBodyRadiusKm;
    return (rKm) => rKm * k;
  }
  // heliocentric / slingshot / missions
  const p = compressed ? 0.5 : 1;
  return (rKm) => 10 * Math.pow(rKm / AU_KM, p); // 1 AU = 10 units
}

/** Exact inverse of `makeRadialScale` for the same arguments. */
export function makeRadialInverse(
  mode: Mode,
  compressed: boolean,
  centralBodyRadiusKm = 6378,
): RadialInverse {
  if (mode === 'geocentric') return (units) => units * 1000;
  if (mode === 'oberth') return (units) => (units * centralBodyRadiusKm) / 6.378;
  const p = compressed ? 0.5 : 1;
  return (units) => AU_KM * Math.pow(Math.max(0, units) / 10, 1 / p);
}

function useScaleArgs() {
  return useStore(
    useShallow((s) => [s.mode, s.compressedScale, getCentralBody(s.obBodyId).radiusKm] as const),
  );
}

export function useRadialScale(): RadialScale {
  const [mode, compressed, obRadius] = useScaleArgs();
  return useMemo(() => makeRadialScale(mode, compressed, obRadius), [mode, compressed, obRadius]);
}

export function useRadialInverse(): RadialInverse {
  const [mode, compressed, obRadius] = useScaleArgs();
  return useMemo(() => makeRadialInverse(mode, compressed, obRadius), [mode, compressed, obRadius]);
}

/** Polar (rUnits, theta) -> three.js x/z plane, counterclockwise seen from +y. */
export function polarToVec3(rUnits: number, theta: number): [number, number, number] {
  return [rUnits * Math.cos(theta), 0, -rUnits * Math.sin(theta)];
}

/**
 * Proportional mode pins the largest body in the solar system (Jupiter) to this
 * many scene units and scales every other body linearly from it, so Earth
 * really is 1/11th of Jupiter — unlike `readable`, which flattens the range.
 */
const JUPITER_RADIUS_KM = 69_911;
const PROPORTIONAL_JUPITER_UNITS = 1.7;

/**
 * Exaggerated display radius for planets. At 1 AU = 10 units a true-scale Earth
 * is 4e-4 units across — a single dim pixel — so the default squashes the
 * 2,440-to-69,911 km range logarithmically to keep every body clickable.
 */
export function planetDisplayRadius(bodyRadiusKm: number): number {
  return Math.max(0.3, 0.3 + 0.5 * Math.log10(bodyRadiusKm / 2440));
}

/**
 * Body radius in scene units under the chosen honesty setting. `readable` is
 * the legible default; `proportional` keeps true size ratios; `true` uses the
 * distance scale itself, which is accurate and nearly invisible — the point.
 */
export function makeBodyRadius(
  sizeMode: BodySizeMode,
  scaleFn: RadialScale,
): (bodyRadiusKm: number) => number {
  if (sizeMode === 'true') return (r) => scaleFn(r);
  if (sizeMode === 'proportional') {
    const k = PROPORTIONAL_JUPITER_UNITS / JUPITER_RADIUS_KM;
    return (r) => r * k;
  }
  return planetDisplayRadius;
}

export function useBodyRadius(): (bodyRadiusKm: number) => number {
  const sizeMode = useStore((s) => s.bodySizeMode);
  const scaleFn = useRadialScale();
  return useMemo(() => makeBodyRadius(sizeMode, scaleFn), [sizeMode, scaleFn]);
}

/**
 * How many times larger than life a body is drawn — 1 means true scale.
 * Earth is the yardstick because every mode has it on screen or nearby.
 */
export function bodyExaggeration(
  bodyRadiusKm: number,
  sizeMode: BodySizeMode,
  scaleFn: RadialScale,
): number {
  const trueUnits = scaleFn(bodyRadiusKm);
  if (trueUnits <= 0) return 1;
  return makeBodyRadius(sizeMode, scaleFn)(bodyRadiusKm) / trueUnits;
}
