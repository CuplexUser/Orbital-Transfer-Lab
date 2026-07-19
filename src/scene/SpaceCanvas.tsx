import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useStore, type Mode } from '../state/store';
import { Effects } from './Effects';
import { FocusRig } from './focus';
import { GeocentricScene } from './GeocentricScene';
import { HeliocentricScene } from './HeliocentricScene';
import { MissionScene } from './MissionScene';
import { OberthScene } from './OberthScene';
import { SimulationClock } from './SimulationClock';
import { SlingshotScene } from './SlingshotScene';

const SCENES: Record<Mode, () => React.ReactElement> = {
  heliocentric: HeliocentricScene,
  geocentric: GeocentricScene,
  slingshot: SlingshotScene,
  oberth: OberthScene,
  missions: MissionScene,
};

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
      <Stars radius={1400} depth={160} count={5000} factor={9} saturation={0} fade speed={0.25} />
      <Stars radius={700} depth={80} count={2500} factor={4} saturation={0.4} fade speed={0.5} />
      <SimulationClock />
      <SceneForMode />
      {/* Mounted after the scene so it re-targets the camera after bodies have moved this frame */}
      <FocusRig />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={3000} />
      <Effects />
    </Canvas>
  );
}
