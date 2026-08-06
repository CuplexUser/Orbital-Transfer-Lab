import { useMemo } from 'react';
import { EARTH_RADIUS_KM } from '../physics';
import { useTransferInputs } from '../state/selectors';
import { useStore } from '../state/store';
import { EarthVisual } from './EarthVisual';
import { FitCamera } from './FitCamera';
import { RealScaleMoon } from './Moons';
import { OrbitRing } from './OrbitRing';
import { Spacecraft } from './Spacecraft';
import { TransferArc } from './TransferArc';
import { useRadialScale, useTrueRadialScale } from './scale';

export function GeocentricScene() {
  const { r1, r2 } = useTransferInputs();
  const toMoon = useStore((s) => s.geoTarget === 'moon');
  const following = useStore((s) => s.focusId === 'ship');
  const scaleFn = useRadialScale();
  // Bodies keep their true size even when the radial axis is compressed.
  const bodyScaleFn = useTrueRadialScale();
  const fitRadius = useMemo(() => scaleFn(Math.max(r1, r2)), [scaleFn, r1, r2]);

  return (
    <>
      {/* Chasing the ship is only useful up close — framing the whole orbit
          while re-centring on a moving speck just swings the scene around. */}
      <FitCamera radiusUnits={following ? fitRadius * 0.35 : fitRadius} />
      <directionalLight position={[60, 25, 40]} intensity={2.2} color="#fdf6e8" />
      <polarGridHelper args={[fitRadius * 1.15, 12, 5, 96, 0x1d2745, 0x131a30]} position={[0, -0.08, 0]} />

      {/* Earth, true scale: 1 unit = 1,000 km */}
      <EarthVisual radiusUnits={bodyScaleFn(EARTH_RADIUS_KM)} />

      <OrbitRing rKm={r1} scaleFn={scaleFn} color="#64d2ff" opacity={0.7} lineWidth={1.5} />
      {/* Targeting the Moon, r2 *is* the lunar orbit — RealScaleMoon already draws it */}
      {!toMoon && (
        <OrbitRing rKm={r2} scaleFn={scaleFn} color="#ffb454" opacity={0.7} lineWidth={1.5} />
      )}

      {/* The Moon, true scale and distance — zoom out or focus it to appreciate the gap */}
      <RealScaleMoon scaleFn={scaleFn} bodyScaleFn={bodyScaleFn} emphasized={toMoon} />

      <TransferArc />
      <Spacecraft size={Math.max(0.6, Math.min(fitRadius * 0.018, 2.4))} />
    </>
  );
}
