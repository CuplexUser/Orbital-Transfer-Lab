import { Trail } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Vector3, type Group } from 'three';
import { meanMotion, transferPolarAt, type HohmannResult } from '../physics';
import { useHohmannResult, useTransferInputs } from '../state/selectors';
import { departureBodyAngleAt, useStore, type AppState } from '../state/store';
import { useFocusTarget } from './focus';
import { polarToVec3, useRadialScale } from './scale';
import { glowTexture } from './textures';

/**
 * Ship polar position for the full mission lifecycle:
 * parked on the departure orbit -> transfer ellipse -> circular at target.
 * Heliocentric ships ride the departure planet until launch (return null).
 */
function shipPolar(
  s: AppState,
  result: HohmannResult,
  mu: number,
): { rKm: number; theta: number } | null {
  const { transfer, simTimeS: t } = s;
  if (transfer.status === 'idle' || transfer.status === 'scheduled') {
    if (s.mode === 'heliocentric') return null; // still aboard the departure planet
    return { rKm: result.r1, theta: departureBodyAngleAt(s, t) };
  }
  if (transfer.status === 'inTransit') {
    const { rKm, phi } = transferPolarAt(result, t - transfer.departureTimeS);
    return { rKm, theta: transfer.departureAngleRad + phi };
  }
  // Arrived: circular orbit at r2 from the arrival point.
  const arrivalTimeS = transfer.departureTimeS + result.transferTimeS;
  const n2 = meanMotion(mu, result.r2);
  return {
    rKm: result.r2,
    theta: transfer.departureAngleRad + Math.PI + n2 * (t - arrivalTimeS),
  };
}

/** Glowing craft model shared by every mode; oriented along its motion. */
export function ShipModel({ size, color = '#ffd27d' }: { size: number; color?: string }) {
  const engineTex = useMemo(() => glowTexture('#ffb454'), []);
  return (
    <group>
      {/* Body: elongated octahedron reads as a probe at any zoom */}
      <mesh rotation={[0, 0, -Math.PI / 2]} scale={[1, 2.2, 1]}>
        <octahedronGeometry args={[size * 0.55]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.35} />
      </mesh>
      {/* Dish */}
      <mesh position={[size * 0.9, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[size * 0.55, size * 0.4, 16, 1, true]} />
        <meshStandardMaterial color="#dfe8f5" emissive="#8fa3c8" emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
      <sprite scale={[size * 5, size * 5, 1]}>
        <spriteMaterial map={engineTex} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.5} />
      </sprite>
      <pointLight color="#ffb454" intensity={0.7} distance={size * 40} decay={2} />
    </group>
  );
}

export function Spacecraft({ size }: { size: number }) {
  const result = useHohmannResult();
  const { mu } = useTransferInputs();
  const scaleFn = useRadialScale();
  const ref = useRef<Group>(null);
  const lastPos = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());
  useFocusTarget('ship', ref);

  useFrame(() => {
    if (!ref.current) return;
    const pos = shipPolar(useStore.getState(), result, mu);
    if (!pos) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const [x, y, z] = polarToVec3(scaleFn(pos.rKm), pos.theta);
    const moved =
      Math.abs(x - lastPos.current.x) + Math.abs(z - lastPos.current.z) > 1e-7;
    if (moved) {
      lookTarget.current.set(x + (x - lastPos.current.x), y, z + (z - lastPos.current.z));
    }
    lastPos.current.copy(ref.current.position);
    ref.current.position.set(x, y, z);
    if (moved) ref.current.lookAt(lookTarget.current);
  });

  return (
    <Trail width={size * 3.2} length={7} color="#b06a28" attenuation={(t) => t * t}>
      <group ref={ref} visible={false}>
        <ShipModel size={size} />
      </group>
    </Trail>
  );
}
