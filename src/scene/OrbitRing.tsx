import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { polarToVec3, type RadialScale } from './scale';

interface OrbitRingProps {
  rKm: number;
  scaleFn: RadialScale;
  color: string;
  opacity?: number;
  lineWidth?: number;
}

const SEGMENTS = 180;

export function OrbitRing({ rKm, scaleFn, color, opacity = 0.5, lineWidth = 1 }: OrbitRingProps) {
  const points = useMemo(() => {
    const r = scaleFn(rKm);
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      pts.push(polarToVec3(r, (2 * Math.PI * i) / SEGMENTS));
    }
    return pts;
  }, [rKm, scaleFn]);

  return <Line points={points} color={color} lineWidth={lineWidth} transparent opacity={opacity} />;
}
