import { useMemo } from 'react';
import { EARTH_RADIUS_KM } from '../physics';
import { useTransferInputs } from '../state/selectors';
import { EarthVisual } from './EarthVisual';
import { FitCamera } from './FitCamera';
import { RealScaleMoon } from './Moons';
import { OrbitRing } from './OrbitRing';
import { Spacecraft } from './Spacecraft';
import { TransferArc } from './TransferArc';
import { useRadialScale } from './scale';

export function GeocentricScene() {
  const { r1, r2 } = useTransferInputs();
  const scaleFn = useRadialScale();
  const fitRadius = useMemo(() => scaleFn(Math.max(r1, r2)), [scaleFn, r1, r2]);

  return (
    <>
      <FitCamera radiusUnits={fitRadius} />
      <directionalLight position={[60, 25, 40]} intensity={2.2} color="#fdf6e8" />
      <polarGridHelper args={[fitRadius * 1.15, 12, 5, 96, 0x1d2745, 0x131a30]} position={[0, -0.08, 0]} />

      {/* Earth, true scale: 1 unit = 1,000 km */}
      <EarthVisual radiusUnits={scaleFn(EARTH_RADIUS_KM)} />

      <OrbitRing rKm={r1} scaleFn={scaleFn} color="#64d2ff" opacity={0.7} lineWidth={1.5} />
      <OrbitRing rKm={r2} scaleFn={scaleFn} color="#ffb454" opacity={0.7} lineWidth={1.5} />

      {/* The Moon, true scale and distance — zoom out or focus it to appreciate the gap */}
      <RealScaleMoon scaleFn={scaleFn} />

      <TransferArc />
      <Spacecraft size={Math.max(0.6, fitRadius * 0.018)} />
    </>
  );
}
