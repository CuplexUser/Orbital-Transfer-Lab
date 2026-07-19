import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { Vec2 } from '../physics';
import type { RadialScale } from './scale';

interface ConicPathProps {
  /** 2D points in km, frame: x = reference axis, y = 90° prograde */
  points2D: Vec2[];
  scaleFn: RadialScale;
  /** Rotate the whole curve about the center, rad */
  rotationRad?: number;
  color: string;
  lineWidth?: number;
  opacity?: number;
  dashed?: boolean;
  /** Cone arrowhead at the last point, oriented along the curve */
  arrowhead?: boolean;
  arrowSize?: number;
}

/**
 * Renders a physical-space 2D curve (km) into the scene, mapping every point
 * through the radial scale so nonlinear compression keeps curves attached to
 * their orbit rings.
 */
export function ConicPath({
  points2D,
  scaleFn,
  rotationRad = 0,
  color,
  lineWidth = 1.5,
  opacity = 0.9,
  dashed = false,
  arrowhead = false,
  arrowSize = 1,
}: ConicPathProps) {
  const { points, arrow } = useMemo(() => {
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    const pts: [number, number, number][] = [];
    for (const p of points2D) {
      const x = p.x * cos - p.y * sin;
      const y = p.x * sin + p.y * cos;
      const r = Math.hypot(x, y);
      if (r === 0) {
        pts.push([0, 0, 0]);
        continue;
      }
      const s = scaleFn(r) / r;
      pts.push([x * s, 0, -y * s]);
    }
    let arrowData: { pos: [number, number, number]; angle: number } | null = null;
    if (arrowhead && pts.length >= 2) {
      const [x1, , z1] = pts[pts.length - 2];
      const [x2, , z2] = pts[pts.length - 1];
      arrowData = { pos: [x2, 0, z2], angle: Math.atan2(-(z2 - z1), x2 - x1) };
    }
    return { points: pts, arrow: arrowData };
  }, [points2D, scaleFn, rotationRad, arrowhead]);

  if (points.length < 2) return null;

  const span = Math.max(...points.map(([x, , z]) => Math.hypot(x, z)));

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        dashed={dashed}
        dashSize={span * 0.035}
        gapSize={span * 0.022}
      />
      {arrow && (
        // Cone points +Y by default; rotate into the x/z plane along the path direction.
        <mesh position={arrow.pos} rotation={[0, arrow.angle, -Math.PI / 2]}>
          <coneGeometry args={[arrowSize * 0.45, arrowSize * 1.4, 12]} />
          <meshBasicMaterial color={color} transparent opacity={Math.min(1, opacity + 0.1)} />
        </mesh>
      )}
    </group>
  );
}
