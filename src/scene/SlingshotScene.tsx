import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Mesh } from 'three';
import { PLANETS, PLANET_LIST, sampleConic, type PlanetSpec } from '../physics';
import { useFlybyResult } from '../state/selectors';
import { useStore } from '../state/store';
import { ConicPath } from './ConicPath';
import { FitCamera } from './FitCamera';
import { MoonSystem } from './Moons';
import { OrbitRing } from './OrbitRing';
import { EARTH_MAP_URL, realTexture } from './realTextures';
import { ShipModel } from './Spacecraft';
import { SunVisual } from './SunVisual';
import { planetDisplayRadius, polarToVec3, useRadialScale } from './scale';
import { glowTexture, planetTexture, saturnRingTexture } from './textures';

/** Planet visuals without orbital motion — the parent group sets the position. */
function PinnedPlanet({ spec }: { spec: PlanetSpec }) {
  const displayR = planetDisplayRadius(spec.bodyRadiusKm) * 1.6;
  const meshRef = useRef<Mesh>(null);
  const map = useMemo(
    () => (spec.id === 'earth' ? realTexture(EARTH_MAP_URL) : planetTexture(spec.id)),
    [spec.id],
  );
  const haloTex = useMemo(() => glowTexture(spec.color), [spec.color]);
  const ringTex = useMemo(() => (spec.id === 'saturn' ? saturnRingTexture() : null), [spec.id]);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.12;
  });
  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[displayR, 48, 48]} />
        <meshStandardMaterial map={map} roughness={0.9} />
      </mesh>
      <sprite scale={[displayR * 4.4, displayR * 4.4, 1]}>
        <spriteMaterial map={haloTex} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.35} />
      </sprite>
      {ringTex && (
        <mesh rotation={[Math.PI / 2 - 0.35, 0, 0.2]}>
          <ringGeometry args={[displayR * 1.35, displayR * 2.3, 96]} />
          <meshBasicMaterial map={ringTex} transparent side={DoubleSide} opacity={0.85} depthWrite={false} />
        </mesh>
      )}
      <MoonSystem planetId={spec.id} parentDisplayR={displayR} />
    </group>
  );
}

/**
 * Gravity-assist lab. The flyby planet is pinned at reference angle 0 (the
 * sim clock is irrelevant here); the incoming and outgoing heliocentric
 * conics are drawn through it, both mapped through the radial scale.
 */
export function SlingshotScene() {
  const planetId = useStore((s) => s.ssPlanet);
  const scaleFn = useRadialScale();
  const planet = PLANETS[planetId];
  const result = useFlybyResult();

  const rMax = planet.orbitRadiusKm * 1.9;
  const prePoints = useMemo(() => sampleConic(result.preOrbit, rMax, 220), [result, rMax]);
  const postPoints = useMemo(() => sampleConic(result.postOrbit, rMax, 220), [result, rMax]);

  const fitRadius = scaleFn(planet.orbitRadiusKm) * 1.35;
  const planetPos = polarToVec3(scaleFn(planet.orbitRadiusKm), 0);
  const arrowSize = fitRadius * 0.02;

  return (
    <>
      <FitCamera radiusUnits={fitRadius} />
      <SunVisual radius={Math.max(1.4, fitRadius * 0.03)} />
      <polarGridHelper args={[fitRadius * 1.1, 12, 6, 96, 0x1d2745, 0x131a30]} position={[0, -0.08, 0]} />

      {PLANET_LIST.map((p) => (
        <OrbitRing
          key={p.id}
          rKm={p.orbitRadiusKm}
          scaleFn={scaleFn}
          color={p.id === planetId ? p.color : '#3a4668'}
          opacity={p.id === planetId ? 0.65 : 0.14}
          lineWidth={p.id === planetId ? 1.5 : 1}
        />
      ))}

      <group position={planetPos}>
        <PinnedPlanet spec={planet} />
      </group>

      {/* Incoming (dashed ice) and outgoing (solid amber) heliocentric orbits */}
      <ConicPath
        points2D={prePoints}
        scaleFn={scaleFn}
        color="#64d2ff"
        lineWidth={1.6}
        opacity={0.75}
        dashed
        arrowhead
        arrowSize={arrowSize}
      />
      <ConicPath
        points2D={postPoints}
        scaleFn={scaleFn}
        color="#ffb454"
        lineWidth={2.2}
        opacity={0.95}
        arrowhead
        arrowSize={arrowSize * 1.15}
      />

      <group position={[planetPos[0], 0, planetPos[2] + fitRadius * 0.045]}>
        <ShipModel size={fitRadius * 0.012} />
      </group>

      <Html position={[planetPos[0], fitRadius * 0.1, planetPos[2]]} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
        <span className="scene-label" style={{ opacity: 0.9 }}>
          {planet.name} · encounter
        </span>
      </Html>
    </>
  );
}
