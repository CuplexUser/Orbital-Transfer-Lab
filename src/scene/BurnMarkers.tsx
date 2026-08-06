import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { BurnSpec } from '../physics';
import { useHohmannBurns, useTransferInputs } from '../state/selectors';
import { useStore } from '../state/store';
import { polarToVec3, useRadialScale } from './scale';

/** Where a burn sits in the mission timeline — drives its colour and pulse. */
type BurnPhase = 'next' | 'pending' | 'done';

const PHASE_COLOR: Record<BurnPhase, string> = {
  next: '#ffb454',
  pending: '#6d7ea8',
  done: '#38d9a9',
};

/**
 * Arrow length is a single km/s -> scene-units factor shared by both burns, so
 * the two arrows can be compared by eye. It is capped against the *inner*
 * orbit so a 3 km/s injection out of LEO doesn't draw an arrow longer than the
 * Earth-to-Moon gap it is aimed across.
 */
function unitsPerKmS(spanUnits: number, innerUnits: number, maxDvKmS: number): number {
  if (maxDvKmS <= 0) return 0;
  return Math.min(spanUnits * 0.09, innerUnits * 1.6) / maxDvKmS;
}

function BurnArrow({
  burn,
  index,
  rUnits,
  spanUnits,
  lengthUnits,
  dotRadius,
  phase,
}: {
  burn: BurnSpec;
  index: number;
  rUnits: number;
  spanUnits: number;
  lengthUnits: number;
  dotRadius: number;
  phase: BurnPhase;
}) {
  const dotRef = useRef<Mesh>(null);
  const prograde = burn.dvKmS >= 0;
  const color = PHASE_COLOR[phase];
  // Tangent to the circular orbit at this point; retrograde burns point backwards.
  const yaw = burn.phiRad + (prograde ? Math.PI / 2 : -Math.PI / 2);
  // Head eats into the shaft rather than extending past it, so the tip lands
  // exactly at lengthUnits and the two arrows stay comparable by eye.
  const head = lengthUnits * 0.3;
  const shaft = lengthUnits - head;
  const dotR = dotRadius;

  useFrame(({ clock }) => {
    const mat = dotRef.current?.material as MeshBasicMaterial | undefined;
    if (!mat) return;
    // The burn that hasn't happened yet breathes; the others sit still.
    mat.opacity = phase === 'next' ? 0.55 + 0.45 * Math.sin(clock.elapsedTime * 3) ** 2 : 0.9;
  });

  return (
    <group position={polarToVec3(rUnits, burn.phiRad)}>
      <mesh ref={dotRef}>
        <sphereGeometry args={[dotR, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <group rotation={[0, yaw, 0]}>
        <Line
          points={[
            [0, 0, 0],
            [shaft, 0, 0],
          ]}
          color={color}
          lineWidth={2.5}
          transparent
          opacity={phase === 'pending' ? 0.5 : 0.95}
        />
        <mesh position={[lengthUnits - head / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[head * 0.42, head, 14]} />
          <meshBasicMaterial color={color} transparent opacity={phase === 'pending' ? 0.5 : 0.95} toneMapped={false} />
        </mesh>
      </group>
      <Html
        position={[0, dotR * 1.5 + lengthUnits * 0.35 + spanUnits * 0.015, 0]}
        center
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <span className={`scene-label burn-label burn-${phase}`}>
          Δv<sub>{index + 1}</sub> {Math.abs(burn.dvKmS).toFixed(3)} km/s
          <em>{prograde ? '▲ prograde' : '▼ retrograde'}</em>
        </span>
      </Html>
    </group>
  );
}

/**
 * The two impulses of the transfer, drawn where they happen and pointing the
 * way the engine actually fires, with arrow length proportional to Δv.
 * Mounted inside TransferArc's group, so it inherits the departure rotation.
 */
export function BurnMarkers() {
  const burns = useHohmannBurns();
  const { r1, r2 } = useTransferInputs();
  const scaleFn = useRadialScale();
  const status = useStore((s) => s.transfer.status);

  if (burns.length === 0) return null;

  const span = scaleFn(Math.max(r1, r2));
  const inner = scaleFn(Math.min(r1, r2));
  const maxDv = Math.max(...burns.map((b) => Math.abs(b.dvKmS)));
  const k = unitsPerKmS(span, inner, maxDv);
  // Sized off the whole view, not the orbit it sits on: a marker scaled to a
  // 384,000 km lunar orbit would out-size the Moon itself.
  const dotRadius = Math.max(span * 0.006, k * maxDv * 0.06);

  const phaseOf = (i: number): BurnPhase => {
    if (status === 'arrived') return 'done';
    if (status === 'inTransit') return i === 0 ? 'done' : 'next';
    return i === 0 ? 'next' : 'pending';
  };

  return (
    <>
      {burns.map((burn, i) => (
        <BurnArrow
          key={burn.id}
          burn={burn}
          index={i}
          rUnits={scaleFn(burn.radiusKm)}
          spanUnits={span}
          lengthUnits={Math.max(k * Math.abs(burn.dvKmS), span * 0.012)}
          dotRadius={dotRadius}
          phase={phaseOf(i)}
        />
      ))}
    </>
  );
}
