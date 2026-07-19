import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
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
 *
 * Two phases: right after the focus target changes, it *seeks* — easing the
 * controls target onto the body, overriding any pan so the camera lands on
 * the new focus. Once converged it switches to *tracking* — each frame it
 * nudges the controls target by only the body's own incremental motion, not
 * its absolute position. That preserves any offset the user has since panned
 * in, instead of yanking the view back to the body every frame.
 */
export function FocusRig() {
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const camera = useThree((s) => s.camera);
  const lastFocusId = useRef<string | null>(null);
  const trackedPos = useRef(new Vector3());
  const seeking = useRef(true);

  useFrame((_, delta) => {
    if (!controls) return;
    const focusId = useStore.getState().focusId;
    const obj = focusId === 'sun' ? null : targets.get(focusId);
    if (obj && obj.visible) {
      obj.getWorldPosition(desired);
    } else {
      desired.set(0, 0, 0);
    }

    if (focusId !== lastFocusId.current) {
      lastFocusId.current = focusId;
      seeking.current = true;
    }

    if (seeking.current) {
      diff.subVectors(desired, controls.target);
      const d2 = diff.lengthSq();
      if (d2 < 1e-6) {
        seeking.current = false;
        trackedPos.current.copy(desired);
        return;
      }
      const k = Math.min(1, 6 * delta);
      diff.multiplyScalar(k);
      controls.target.add(diff);
      camera.position.add(diff);
      return;
    }

    diff.subVectors(desired, trackedPos.current);
    if (diff.lengthSq() > 1e-12) {
      controls.target.add(diff);
      camera.position.add(diff);
    }
    trackedPos.current.copy(desired);
  });

  return null;
}
