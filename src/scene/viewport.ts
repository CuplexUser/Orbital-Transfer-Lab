import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import type { PerspectiveCamera, Vector3 } from 'three';

export interface ViewportSample {
  /** Scene units spanned by one screen pixel at the camera's focal plane */
  unitsPerPixel: number;
  /** Distance of the camera target from the scene origin, in scene units */
  targetRadiusUnits: number;
}

/**
 * Mutable module-level sample rather than store state: this changes on every
 * mouse-wheel tick, and the scale readout is the only consumer — routing it
 * through zustand would re-render React on every camera nudge.
 */
const sample: ViewportSample = { unitsPerPixel: 0, targetRadiusUnits: 0 };

/** Current sample, for per-frame readers that must not trigger a re-render. */
export function readViewport(): ViewportSample {
  return sample;
}

interface ControlsLike {
  target: Vector3;
}

/** Mount inside the Canvas (after OrbitControls) to keep the sample current. */
export function ViewportProbe() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  useFrame(() => {
    const target = controls?.target;
    const distance = target ? camera.position.distanceTo(target) : camera.position.length();
    const halfFov = ((camera.fov ?? 45) * Math.PI) / 360;
    sample.unitsPerPixel = (2 * distance * Math.tan(halfFov)) / Math.max(1, size.height);
    sample.targetRadiusUnits = target ? Math.hypot(target.x, target.z) : 0;
  });

  return null;
}

/**
 * Poll the sample at a UI-friendly rate — the ruler only needs to keep up with
 * the eye, not with the render loop.
 */
export function useViewport(intervalMs = 120): ViewportSample {
  const [v, setV] = useState<ViewportSample>(() => ({ ...sample }));
  useEffect(() => {
    const id = setInterval(() => {
      setV((prev) =>
        prev.unitsPerPixel === sample.unitsPerPixel &&
        prev.targetRadiusUnits === sample.targetRadiusUnits
          ? prev
          : { ...sample },
      );
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return v;
}
