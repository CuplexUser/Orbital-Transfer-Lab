import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Group, type Mesh } from 'three';
import { MU_SUN, meanMotion, type PlanetSpec } from '../physics';
import { useStore } from '../state/store';
import { useFocusTarget } from './focus';
import { MoonSystem } from './Moons';
import { planetMapUrl, realTexture, SATURN_RING_MAP_URL } from './realTextures';
import { polarToVec3, useBodyRadius, type RadialScale } from './scale';
import { glowTexture, planetTexture } from './textures';
import { readViewport } from './viewport';

interface PlanetBodyProps {
  spec: PlanetSpec;
  scaleFn: RadialScale;
  emphasized: boolean;
  /** Override the orbital phase at t=0 (missions mode: real J2000-based angle) */
  epochAngleOverrideRad?: number;
  /** Multiplier on the exaggerated display radius */
  sizeBoost?: number;
  /** Render the planet's major moons on exaggerated orbits */
  showMoons?: boolean;
}

const SPIN_RAD_PER_S = 0.12;

/** Minimum on-screen orbit radius, in pixels, for a non-highlighted label to show. */
const LABEL_MIN_ORBIT_PX = 46;

export function PlanetBody({
  spec,
  scaleFn,
  emphasized,
  epochAngleOverrideRad,
  sizeBoost = 1,
  showMoons = true,
}: PlanetBodyProps) {
  const ref = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const setFocus = useStore((s) => s.setFocus);
  const focused = useStore((s) => s.focusId === spec.id);
  const bodyRadius = useBodyRadius();
  const n = meanMotion(MU_SUN, spec.orbitRadiusKm);
  const rUnits = scaleFn(spec.orbitRadiusKm);
  const displayR = bodyRadius(spec.bodyRadiusKm) * sizeBoost;
  const epoch = epochAngleOverrideRad ?? spec.epochAngleRad;
  // True/proportional scales shrink bodies to specks — the halo keeps them
  // findable and clickable without inflating the body itself.
  const haloR = Math.max(displayR * 4.4, 0.7);

  const map = useMemo(() => {
    const url = planetMapUrl(spec.id);
    return url ? realTexture(url) : planetTexture(spec.id);
  }, [spec.id]);
  const haloTex = useMemo(() => glowTexture(spec.color), [spec.color]);
  const ringTex = useMemo(() => (spec.id === 'saturn' ? realTexture(SATURN_RING_MAP_URL) : null), [spec.id]);

  useFocusTarget(spec.id, ref);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const t = useStore.getState().simTimeS;
    const [x, y, z] = polarToVec3(rUnits, epoch + n * t);
    ref.current.position.set(x, y, z);
    if (meshRef.current) meshRef.current.rotation.y += delta * SPIN_RAD_PER_S;

    // Zoomed out far enough and the inner planets pile onto the Sun; fade any
    // label whose orbit is too small on screen to sit clear of its neighbours.
    const label = labelRef.current;
    if (label) {
      const { unitsPerPixel } = readViewport();
      const orbitPx = unitsPerPixel > 0 ? rUnits / unitsPerPixel : Infinity;
      const crowded = orbitPx < LABEL_MIN_ORBIT_PX && !emphasized && !focused;
      label.style.opacity = crowded ? '0' : focused ? '1' : emphasized ? '0.95' : '0.45';
    }
  });

  return (
    <group ref={ref}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[displayR, 48, 48]} />
        <meshStandardMaterial map={map} roughness={0.9} metalness={0} />
      </mesh>
      {/* Soft halo so bodies read against black; brighter when involved in the transfer */}
      <sprite scale={[haloR, haloR, 1]}>
        <spriteMaterial
          map={haloTex}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          opacity={emphasized ? 0.38 : 0.16}
        />
      </sprite>
      {ringTex && (
        <mesh rotation={[Math.PI / 2 - 0.35, 0, 0.2]}>
          <ringGeometry args={[displayR * 1.35, displayR * 2.3, 96]} />
          <meshBasicMaterial map={ringTex} transparent side={DoubleSide} opacity={0.85} depthWrite={false} />
        </mesh>
      )}
      {showMoons && <MoonSystem planetId={spec.id} parentDisplayR={displayR} />}
      <Html
        position={[0, displayR + 0.9, 0]}
        center
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <span
          ref={labelRef}
          className={focused ? 'scene-label body-label focused' : 'scene-label body-label'}
          title={focused ? 'Unfocus camera' : 'Focus camera here'}
          onClick={() => setFocus(focused ? 'sun' : spec.id)}
        >
          {spec.name}
        </span>
      </Html>
    </group>
  );
}
