import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Mesh } from 'three';
import { sampleConic, type CentralBody } from '../physics';
import { useOberthBody, useOberthResult } from '../state/selectors';
import { ConicPath } from './ConicPath';
import { EarthVisual } from './EarthVisual';
import { FitCamera } from './FitCamera';
import { useRadialScale } from './scale';
import { SunVisual } from './SunVisual';
import { glowTexture, moonSurfaceTexture, planetTexture, saturnRingTexture } from './textures';

/** The Oberth lab's central body, rendered close-up: Sun, planet, or moon. */
function CentralBodyVisual({ body, radiusUnits }: { body: CentralBody; radiusUnits: number }) {
  const meshRef = useRef<Mesh>(null);
  const map = useMemo(() => {
    if (body.kind === 'star') return null;
    return body.kind === 'planet'
      ? planetTexture(body.id as Parameters<typeof planetTexture>[0])
      : moonSurfaceTexture(body.id as Parameters<typeof moonSurfaceTexture>[0]);
  }, [body]);
  const halo = useMemo(() => glowTexture(body.color), [body.color]);
  const ringTex = useMemo(() => (body.id === 'saturn' ? saturnRingTexture() : null), [body.id]);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05;
  });

  if (body.kind === 'star') return <SunVisual radius={radiusUnits} />;
  if (body.id === 'earth') return <EarthVisual radiusUnits={radiusUnits} />;
  return (
    <group>
      <mesh ref={meshRef} rotation={[0.2, 0, 0]}>
        <sphereGeometry args={[radiusUnits, 64, 64]} />
        <meshStandardMaterial map={map} roughness={0.85} metalness={0} emissive="#1a1408" emissiveIntensity={0.25} />
      </mesh>
      {ringTex && (
        <mesh rotation={[Math.PI / 2 - 0.35, 0, 0.2]}>
          <ringGeometry args={[radiusUnits * 1.35, radiusUnits * 2.3, 96]} />
          <meshBasicMaterial map={ringTex} transparent side={DoubleSide} opacity={0.85} depthWrite={false} />
        </mesh>
      )}
      <sprite scale={[radiusUnits * 3.2, radiusUnits * 3.2, 1]}>
        <spriteMaterial map={halo} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.18} />
      </sprite>
    </group>
  );
}

/**
 * Oberth-effect lab: a fixed prograde burn applied somewhere on an elliptical
 * orbit around any central body. Before-orbit dashed ice, after-orbit solid
 * amber; the burn point glows where the impulse happens. The radial scale is
 * fixed per body, so dragging the apoapsis grows the orbit while the camera
 * smoothly pulls back — the body itself never appears to change size.
 */
export function OberthScene() {
  const body = useOberthBody();
  const scaleFn = useRadialScale();
  const result = useOberthResult();

  const rApo = result.initialOrbit.a * (1 + result.initialOrbit.e);
  const rMax = Math.max(rApo * 2.4, (result.newApoapsisKm ?? rApo * 3) * 1.15);
  const beforePoints = useMemo(() => sampleConic(result.initialOrbit, rMax, 200), [result, rMax]);
  const afterPoints = useMemo(() => sampleConic(result.newOrbit, rMax, 220), [result, rMax]);

  const fitRadius = scaleFn(Math.min(rMax, rApo * 2.2));
  const burnGlow = useMemo(() => glowTexture('#ffc069'), []);

  const bp = result.burnPointVec;
  const br = Math.hypot(bp.x, bp.y);
  const bs = scaleFn(br) / br;
  const burnPos: [number, number, number] = [bp.x * bs, 0, -bp.y * bs];
  const glowSize = fitRadius * 0.06;

  return (
    <>
      <FitCamera radiusUnits={fitRadius} />
      {body.kind !== 'star' && <directionalLight position={[60, 25, 40]} intensity={2.0} color="#fdf6e8" />}
      <polarGridHelper args={[fitRadius * 1.15, 12, 5, 96, 0x1d2745, 0x131a30]} position={[0, -0.08, 0]} />

      <CentralBodyVisual body={body} radiusUnits={scaleFn(body.radiusKm)} />

      <ConicPath points2D={beforePoints} scaleFn={scaleFn} color="#64d2ff" lineWidth={1.6} opacity={0.7} dashed />
      <ConicPath
        points2D={afterPoints}
        scaleFn={scaleFn}
        color="#ffb454"
        lineWidth={2.2}
        opacity={0.95}
        arrowhead={result.escapes}
        arrowSize={fitRadius * 0.02}
      />

      {/* Burn point */}
      <group position={burnPos}>
        <mesh>
          <sphereGeometry args={[fitRadius * 0.009, 16, 16]} />
          <meshBasicMaterial color="#ffe4b0" toneMapped={false} />
        </mesh>
        <sprite scale={[glowSize, glowSize, 1]}>
          <spriteMaterial map={burnGlow} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.95} />
        </sprite>
        <Html position={[0, fitRadius * 0.045, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
          <span className="scene-label" style={{ opacity: 0.95 }}>
            burn · {result.burnSpeedKmS.toFixed(2)} km/s
          </span>
        </Html>
      </group>
    </>
  );
}
