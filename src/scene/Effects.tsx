import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useStore } from '../state/store';

export function Effects() {
  const enabled = useStore((s) => s.effectsEnabled);
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.22} luminanceSmoothing={0.2} radius={0.8} />
      <Vignette eskil={false} offset={0.16} darkness={0.78} />
    </EffectComposer>
  );
}
