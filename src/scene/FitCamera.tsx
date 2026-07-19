import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';

interface ControlsLike {
  target: Vector3;
  update?: () => void;
}

const offset = new Vector3();

/**
 * Frames the largest visible orbit. The first fit positions the camera
 * directly; later fits (slider drags, planet switches) ease the camera
 * distance smoothly, so a growing orbit reads as the camera pulling back —
 * not as the central body shrinking. User orbit direction is preserved,
 * and manual zooming is untouched once the ease converges.
 */
export function FitCamera({ radiusUnits }: { radiusUnits: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const desiredRef = useRef<number | null>(null);
  const firstRef = useRef(true);

  useEffect(() => {
    const d = Math.max(radiusUnits * 2.1, 18);
    if (firstRef.current) {
      firstRef.current = false;
      camera.position.set(0, d * 0.55, d);
      camera.lookAt(0, 0, 0);
      controls?.update?.();
      return;
    }
    desiredRef.current = d * Math.hypot(1, 0.55); // same viewing distance as the initial fit
  }, [radiusUnits, camera, controls]);

  useFrame((_, delta) => {
    const want = desiredRef.current;
    if (want === null || !controls) return;
    offset.subVectors(camera.position, controls.target);
    const len = offset.length();
    let next = len + (want - len) * Math.min(1, 5 * delta);
    if (Math.abs(next - want) < want * 0.005) {
      next = want;
      desiredRef.current = null; // converged — hand zoom back to the user
    }
    camera.position.copy(controls.target).addScaledVector(offset.normalize(), next);
  });

  return null;
}
