import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { MOONS, MU_EARTH, PLANETS, meanMotion, moonsOf, type MoonSpec, type PlanetId } from '../physics';
import { useStore } from '../state/store';
import { useFocusTarget } from './focus';
import { MOON_MAP_URL, realTexture } from './realTextures';
import { planetDisplayRadius, polarToVec3, type RadialScale } from './scale';

function circlePoints(r: number, segments = 96): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([r * Math.cos(a), 0, -r * Math.sin(a)]);
  }
  return pts;
}

function MoonDot({
  spec,
  orbitR,
  showLabel,
}: {
  spec: MoonSpec;
  orbitR: number;
  showLabel: boolean;
}) {
  const ref = useRef<Group>(null);
  const parentMu = PLANETS[spec.parent].muKm3S2;
  const n = meanMotion(parentMu, spec.orbitRadiusKm) * (spec.retrograde ? -1 : 1);
  const size = Math.max(0.05, planetDisplayRadius(spec.bodyRadiusKm) * 0.42);
  const ring = useMemo(() => circlePoints(orbitR), [orbitR]);

  useFrame(() => {
    if (!ref.current) return;
    const t = useStore.getState().simTimeS;
    const [x, y, z] = polarToVec3(orbitR, spec.epochAngleRad + n * t);
    ref.current.position.set(x, y, z);
  });

  return (
    <group>
      <Line points={ring} color={spec.color} lineWidth={0.7} transparent opacity={0.14} />
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[size, 20, 20]} />
          <meshStandardMaterial color={spec.color} roughness={0.9} emissive={spec.color} emissiveIntensity={0.12} />
        </mesh>
        {showLabel && (
          <Html position={[0, size + 0.35, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
            <span className="scene-label moon-label">{spec.name}</span>
          </Html>
        )}
      </group>
    </group>
  );
}

/**
 * A planet's major moons on exaggerated display orbits (true moon orbits are
 * invisibly small at solar-system scale), animated at their real periods —
 * Io laps Callisto just like the real thing. Labels appear when the camera
 * is focused on the parent planet.
 */
export function MoonSystem({
  planetId,
  parentDisplayR,
}: {
  planetId: PlanetId;
  parentDisplayR: number;
}) {
  const moons = moonsOf(planetId);
  const focused = useStore((s) => s.focusId === planetId);
  if (moons.length === 0) return null;
  return (
    <group>
      {moons.map((m, i) => (
        <MoonDot
          key={m.id}
          spec={m}
          orbitR={parentDisplayR * (2.1 + 0.85 * i)}
          showLabel={focused}
        />
      ))}
    </group>
  );
}

/**
 * The Moon at true scale for Earth-orbit mode (1 unit = 1,000 km): a quiet
 * reminder of how far away it really is compared to GEO.
 */
export function RealScaleMoon({ scaleFn }: { scaleFn: RadialScale }) {
  const spec = MOONS.moon;
  const ref = useRef<Group>(null);
  const n = meanMotion(MU_EARTH, spec.orbitRadiusKm);
  const orbitR = scaleFn(spec.orbitRadiusKm);
  const size = scaleFn(spec.bodyRadiusKm); // true scale, ~1.7 units
  const ring = useMemo(() => circlePoints(orbitR, 160), [orbitR]);
  const map = useMemo(() => realTexture(MOON_MAP_URL), []);
  useFocusTarget('moon', ref);

  useFrame(() => {
    if (!ref.current) return;
    const t = useStore.getState().simTimeS;
    const [x, y, z] = polarToVec3(orbitR, spec.epochAngleRad + n * t);
    ref.current.position.set(x, y, z);
  });

  return (
    <group>
      <Line points={ring} color="#8fa3c8" lineWidth={0.8} transparent opacity={0.2} />
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial map={map} roughness={0.95} />
        </mesh>
        <Html position={[0, size + 1.4, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
          <span className="scene-label" style={{ opacity: 0.6 }}>
            Moon · 384,400 km
          </span>
        </Html>
      </group>
    </group>
  );
}
