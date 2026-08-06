import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { radiusAtTrueAnomaly } from '../physics';
import { useHohmannResult } from '../state/selectors';
import { departureBodyAngleAt, useStore } from '../state/store';
import { BurnMarkers } from './BurnMarkers';
import { polarToVec3, useRadialScale } from './scale';

const SEGMENTS = 128;

/**
 * The Hohmann transfer half-ellipse. Geometry is sampled point-by-point in
 * physical space and mapped through the radial scale (never a geometric
 * EllipseCurve, which would detach from the rings under compressed scale).
 * The whole group is rotated to the departure angle each frame, so the
 * geometry itself never needs recomputing while time runs — and the burn
 * markers mounted inside inherit that rotation for free.
 */
export function TransferArc({ showBurns = true }: { showBurns?: boolean } = {}) {
  const result = useHohmannResult();
  const scaleFn = useRadialScale();
  const status = useStore((s) => s.transfer.status);
  const ref = useRef<Group>(null);
  const lineRef = useRef<Line2>(null);

  const points = useMemo(() => {
    if (result.dvTotal === 0) return null;
    const outward = result.r2 >= result.r1;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const phi = (Math.PI * i) / SEGMENTS;
      const nu = outward ? phi : phi + Math.PI;
      const rKm = radiusAtTrueAnomaly(result.aTransfer, result.eTransfer, nu);
      pts.push(polarToVec3(scaleFn(rKm), phi));
    }
    return pts;
  }, [result, scaleFn]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const s = useStore.getState();
    ref.current.rotation.y =
      s.transfer.status === 'idle'
        ? departureBodyAngleAt(s, s.simTimeS)
        : s.transfer.departureAngleRad;
    // Marching dashes while the transfer is only planned.
    const mat = lineRef.current?.material as LineMaterial | undefined;
    if (mat?.dashed) {
      mat.dashOffset -= delta * mat.dashSize * 1.6;
    }
  });

  if (!points) return null;

  const planned = status === 'idle' || status === 'scheduled';
  const span = scaleFn(Math.max(result.r1, result.r2));

  return (
    <group ref={ref}>
      <Line
        key={planned ? 'planned' : 'active'}
        ref={lineRef}
        points={points}
        color={planned ? '#7aa5d8' : '#ffb454'}
        lineWidth={planned ? 1.5 : 2.5}
        transparent
        opacity={planned ? 0.55 : 0.95}
        dashed={planned}
        dashSize={span * 0.045}
        gapSize={span * 0.03}
      />
      {showBurns && <BurnMarkers />}
    </group>
  );
}
