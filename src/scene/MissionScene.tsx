import { Html, Line, Trail } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Group } from 'three';
import {
  MISSIONS,
  missionShipAt,
  planetAngleAtDate,
  type MissionDef,
  type MissionPath,
} from '../data/missions';
import { AU_KM, PLANETS, SECONDS_PER_DAY } from '../physics';
import { useMissionPath, useSimTime } from '../state/selectors';
import { useStore } from '../state/store';
import { PlanetBody } from './Body';
import { FitCamera } from './FitCamera';
import { useFocusTarget } from './focus';
import { OrbitRing } from './OrbitRing';
import { ShipModel } from './Spacecraft';
import { SunVisual } from './SunVisual';
import { makeRadialScale, type RadialScale } from './scale';

/** Missions always use the compressed heliocentric scale so 120-AU arcs fit. */
const missionScale: RadialScale = makeRadialScale('heliocentric', true);

function auToWorld(xAu: number, yAu: number): [number, number, number] {
  const r = Math.hypot(xAu, yAu);
  if (r === 0) return [0, 0, 0];
  const s = missionScale(r * AU_KM) / r;
  return [xAu * s, 0, -yAu * s];
}

function MissionShip({ path, sizeUnits }: { path: MissionPath; sizeUnits: number }) {
  const ref = useRef<Group>(null);
  const lastPos = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());
  const endedRef = useRef(false);
  useFocusTarget('ship', ref);

  useFrame(() => {
    if (!ref.current) return;
    const s = useStore.getState();
    const tDays = s.simTimeS / SECONDS_PER_DAY;
    const p = missionShipAt(path, tDays);
    const [x, y, z] = auToWorld(p.xAu, p.yAu);
    const moved = Math.abs(x - lastPos.current.x) + Math.abs(z - lastPos.current.z) > 1e-7;
    if (moved) lookTarget.current.set(x + (x - lastPos.current.x), y, z + (z - lastPos.current.z));
    lastPos.current.copy(ref.current.position);
    ref.current.position.set(x, y, z);
    if (moved) ref.current.lookAt(lookTarget.current);
    // Auto-pause when the mapped trajectory runs out.
    if (tDays >= path.totalDays && !endedRef.current && s.playing) {
      endedRef.current = true;
      s.setPlaying(false);
    }
    if (tDays < path.totalDays) endedRef.current = false;
  });

  return (
    <Trail width={sizeUnits * 3} length={9} color="#a8622a" attenuation={(t) => t * t}>
      <group ref={ref}>
        <ShipModel size={sizeUnits} />
      </group>
    </Trail>
  );
}

function EventMarker({
  xAu,
  yAu,
  label,
  dateISO,
  passed,
  size,
}: {
  xAu: number;
  yAu: number;
  label: string;
  dateISO: string;
  passed: boolean;
  size: number;
}) {
  const pos = auToWorld(xAu, yAu);
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={passed ? '#ffc069' : '#5a6a94'} toneMapped={false} />
      </mesh>
      <Html position={[0, size * 6, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
        <span className={passed ? 'scene-label event-label passed' : 'scene-label event-label'}>
          {label}
          <em>{dateISO}</em>
        </span>
      </Html>
    </group>
  );
}

export function MissionScene() {
  const missionId = useStore((s) => s.missionId);
  const mission: MissionDef = MISSIONS[missionId];
  const path = useMissionPath();
  const simDays = useSimTime() / SECONDS_PER_DAY;

  const pathPoints = useMemo(
    () => path.points.map((p) => auToWorld(p.xAu, p.yAu)),
    [path],
  );

  const fitRadius = missionScale(mission.maxAu * AU_KM);
  const shipSize = Math.max(0.28, fitRadius * 0.012);

  return (
    <>
      <FitCamera radiusUnits={fitRadius} />
      <SunVisual radius={Math.max(0.9, fitRadius * 0.028)} />
      <polarGridHelper args={[fitRadius * 1.08, 12, 6, 96, 0x1d2745, 0x131a30]} position={[0, -0.08, 0]} />

      {mission.showPlanets.map((id) => (
        <group key={id}>
          <OrbitRing rKm={PLANETS[id].orbitRadiusKm} scaleFn={missionScale} color={PLANETS[id].color} opacity={0.3} lineWidth={1} />
          <PlanetBody
            spec={PLANETS[id]}
            scaleFn={missionScale}
            emphasized={false}
            epochAngleOverrideRad={planetAngleAtDate(id, mission.launchDateISO)}
            sizeBoost={fitRadius > 60 ? 1.6 : 1}
          />
        </group>
      ))}
      {mission.extraRings.map((ring) => (
        <OrbitRing key={ring.label} rKm={ring.rAu * AU_KM} scaleFn={missionScale} color={ring.color} opacity={0.25} lineWidth={1} />
      ))}

      {/* Full trajectory, faint in the mission's color; the ship trail provides the bright leading edge */}
      <Line points={pathPoints} color={mission.color} lineWidth={1.8} transparent opacity={0.42} />

      {path.events.map((e) => (
        <EventMarker
          key={e.label}
          xAu={e.xAu}
          yAu={e.yAu}
          label={e.label}
          dateISO={e.dateISO}
          passed={simDays >= e.tDays}
          size={Math.max(0.12, fitRadius * 0.006)}
        />
      ))}

      <MissionShip path={path} sizeUnits={shipSize} />
    </>
  );
}
