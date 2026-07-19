import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AU_KM, getCentralBody } from '../physics';
import { useStore, type Mode } from '../state/store';

/**
 * The single place km become scene units. Physics stays in km (JS doubles);
 * scene coordinates stay O(1-100) so float32 buffers never see 1e8 magnitudes.
 */
export type RadialScale = (rKm: number) => number;

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

export function useRadialScale(): RadialScale {
  const [mode, compressed, obRadius] = useStore(
    useShallow((s) => [s.mode, s.compressedScale, getCentralBody(s.obBodyId).radiusKm] as const),
  );
  return useMemo(() => makeRadialScale(mode, compressed, obRadius), [mode, compressed, obRadius]);
}

/** Polar (rUnits, theta) -> three.js x/z plane, counterclockwise seen from +y. */
export function polarToVec3(rUnits: number, theta: number): [number, number, number] {
  return [rUnits * Math.cos(theta), 0, -rUnits * Math.sin(theta)];
}

/** Exaggerated display radius for planets (true scale would be invisible). */
export function planetDisplayRadius(bodyRadiusKm: number): number {
  return Math.max(0.3, 0.3 + 0.5 * Math.log10(bodyRadiusKm / 2440));
}
