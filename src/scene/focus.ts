import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, type RefObject } from 'react';
import { Vector3, type Object3D } from 'three';
import { useStore } from '../state/store';

/**
 * Camera focus: any registered scene object (planet, moon, ship) can become
 * the OrbitControls target. Bodies register their group here; FocusRig eases
 * the controls target (and the camera with it) onto the chosen body each
 * frame, so the camera rides along as the body orbits.
 */
const targets = new Map<string, Object3D>();

export function registerFocusTarget(id: string, obj: Object3D): () => void {
  targets.set(id, obj);
  return () => {
    if (targets.get(id) === obj) targets.delete(id);
  };
}

/** React hook flavor for components with a ref. */
export function useFocusTarget(id: string, ref: RefObject<Object3D | null>) {
  useEffect(() => {
    if (!ref.current) return;
    return registerFocusTarget(id, ref.current);
  }, [id, ref]);
}

interface ControlsLike {
  target: Vector3;
}

const desired = new Vector3();
const diff = new Vector3();

/**
 * Mount once per Canvas, after the scene, so its frame callback runs after
 * the bodies have moved. 'sun' (or a missing/hidden target) means the origin.
 */
export function FocusRig() {
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const camera = useThree((s) => s.camera);

  useFrame((_, delta) => {
    if (!controls) return;
    const focusId = useStore.getState().focusId;
    const obj = focusId === 'sun' ? null : targets.get(focusId);
    if (obj && obj.visible) {
      obj.getWorldPosition(desired);
    } else {
      desired.set(0, 0, 0);
    }
    diff.subVectors(desired, controls.target);
    const d2 = diff.lengthSq();
    if (d2 < 1e-10) return;
    // Ease toward the target; snaps to exact tracking once converged.
    const k = d2 < 1e-4 ? 1 : Math.min(1, 6 * delta);
    diff.multiplyScalar(k);
    controls.target.add(diff);
    camera.position.add(diff);
  });

  return null;
}
