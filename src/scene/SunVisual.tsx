import { useMemo } from 'react';
import { AdditiveBlending } from 'three';
import { glowTexture } from './textures';

/** Emissive sun sphere + layered additive glow sprites + the scene's key light. */
export function SunVisual({ radius }: { radius: number }) {
  const glowWarm = useMemo(() => glowTexture('#ffd9a0'), []);
  const glowHot = useMemo(() => glowTexture('#fff3cf'), []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial color="#fff2c8" toneMapped={false} />
      </mesh>
      <sprite scale={[radius * 3.2, radius * 3.2, 1]}>
        <spriteMaterial map={glowHot} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.85} />
      </sprite>
      <sprite scale={[radius * 6, radius * 6, 1]}>
        <spriteMaterial map={glowWarm} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.35} />
      </sprite>
      <pointLight intensity={3.2} decay={0} color="#fff3d6" />
    </group>
  );
}
