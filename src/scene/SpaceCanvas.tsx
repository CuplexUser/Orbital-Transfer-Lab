import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { useStore, type Mode } from '../state/store';
import { Effects } from './Effects';
import { FocusRig } from './focus';
import { GeocentricScene } from './GeocentricScene';
import { HeliocentricScene } from './HeliocentricScene';
import { MissionScene } from './MissionScene';
import { OberthScene } from './OberthScene';
import { SimulationClock } from './SimulationClock';
import { SlingshotScene } from './SlingshotScene';
import { ViewportProbe } from './viewport';

const SCENES: Record<Mode, () => React.ReactElement> = {
  heliocentric: HeliocentricScene,
  geocentric: GeocentricScene,
  slingshot: SlingshotScene,
  oberth: OberthScene,
  missions: MissionScene,
};

/**
 * The starfield as a proper skybox: the shells ride with the camera, so they
 * stay behind everything at every zoom. Pinned to the origin they would be
 * *inside* the camera once a scene gets large — a Moon transfer frames 384
 * scene units, which puts the camera far outside a 700-unit star shell.
 */
function StarField() {
  const ref = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  useFrame(() => ref.current?.position.copy(camera.position));
  return (
    <group ref={ref}>
      <Stars radius={1400} depth={160} count={5000} factor={9} saturation={0} fade speed={0.25} />
      <Stars radius={700} depth={80} count={2500} factor={4} saturation={0.4} fade speed={0.5} />
    </group>
  );
}

export function SpaceCanvas() {
  const mode = useStore((s) => s.mode);
  const SceneForMode = SCENES[mode];

  return (
    <Canvas
      key={mode} // remount on mode switch: fresh camera fit + controls
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.1, far: 6000, position: [0, 44, 80] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#04050c']} />
      <ambientLight intensity={mode === 'geocentric' || mode === 'oberth' ? 0.3 : 0.16} />
      <StarField />
      <SimulationClock />
      <SceneForMode />
      {/* Mounted after the scene so it re-targets the camera after bodies have moved this frame */}
      <FocusRig />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={3000} />
      {/* After OrbitControls so it can read the controls target the same frame */}
      <ViewportProbe />
      <Effects />
    </Canvas>
  );
}
