import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { MU_SUN, PLANETS, PLANET_LIST, meanMotion } from '../physics';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../state/store';
import { FitCamera } from './FitCamera';
import { PlanetBody } from './Body';
import { OrbitRing } from './OrbitRing';
import { Spacecraft } from './Spacecraft';
import { SunVisual } from './SunVisual';
import { TransferArc } from './TransferArc';
import { useRadialScale } from './scale';

/** Faint radial sight-line rotated to a body's angle each frame — makes the phase angle legible. */
function SightLine({
  lengthUnits,
  color,
  epochAngleRad,
  orbitRadiusKm,
}: {
  lengthUnits: number;
  color: string;
  epochAngleRad: number;
  orbitRadiusKm: number;
}) {
  const ref = useRef<Group>(null);
  const n = meanMotion(MU_SUN, orbitRadiusKm);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y = epochAngleRad + n * useStore.getState().simTimeS;
  });
  return (
    <group ref={ref}>
      <Line
        points={[
          [0, 0, 0],
          [lengthUnits, 0, 0],
        ]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.22}
      />
    </group>
  );
}

export function HeliocentricScene() {
  const [departureId, targetId] = useStore(
    useShallow((s) => [s.departurePlanet, s.targetPlanet] as const),
  );
  const transferActive = useStore((s) => s.transfer.status !== 'idle');
  const scaleFn = useRadialScale();

  const dep = PLANETS[departureId];
  const tgt = PLANETS[targetId];
  const fitRadius = useMemo(
    () => scaleFn(Math.max(dep.orbitRadiusKm, tgt.orbitRadiusKm)),
    [scaleFn, dep, tgt],
  );
  const sightLength = fitRadius * 1.04;

  return (
    <>
      <FitCamera radiusUnits={fitRadius} />
      <SunVisual radius={Math.max(1.4, fitRadius * 0.03)} />
      <polarGridHelper args={[fitRadius * 1.12, 12, 6, 96, 0x1d2745, 0x131a30]} position={[0, -0.08, 0]} />

      {PLANET_LIST.map((p) => {
        const involved = p.id === departureId || p.id === targetId;
        return (
          <group key={p.id}>
            <OrbitRing
              rKm={p.orbitRadiusKm}
              scaleFn={scaleFn}
              color={involved ? p.color : '#3a4668'}
              opacity={involved ? 0.6 : 0.18}
              lineWidth={involved ? 1.5 : 1}
            />
            <PlanetBody spec={p} scaleFn={scaleFn} emphasized={involved} />
          </group>
        );
      })}

      {/* Phase-angle sight lines, meaningful while planning a departure */}
      {!transferActive && departureId !== targetId && (
        <>
          <SightLine
            lengthUnits={sightLength}
            color="#ffb454"
            epochAngleRad={dep.epochAngleRad}
            orbitRadiusKm={dep.orbitRadiusKm}
          />
          <SightLine
            lengthUnits={sightLength}
            color="#64d2ff"
            epochAngleRad={tgt.epochAngleRad}
            orbitRadiusKm={tgt.orbitRadiusKm}
          />
        </>
      )}

      <TransferArc />
      <Spacecraft size={0.42} />
    </>
  );
}
