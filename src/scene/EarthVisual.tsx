import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, type Mesh } from 'three';
import { EARTH_MAP_URL, realTexture } from './realTextures';
import { glowTexture } from './textures';

/** Real Blue Marble Earth, rotating, with a fresnel-ish atmosphere shell + halo. */
export function EarthVisual({ radiusUnits }: { radiusUnits: number }) {
  const meshRef = useRef<Mesh>(null);
  const map = useMemo(() => realTexture(EARTH_MAP_URL), []);
  const halo = useMemo(() => glowTexture('#5fb0ff'), []);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group>
      <mesh ref={meshRef} rotation={[0.41, 0, 0]}>
        <sphereGeometry args={[radiusUnits, 64, 64]} />
        <meshStandardMaterial map={map} roughness={0.75} metalness={0} emissive="#0a1a33" emissiveIntensity={0.35} />
      </mesh>
      {/* Atmosphere: BackSide shell reads as a rim glow */}
      <mesh>
        <sphereGeometry args={[radiusUnits * 1.045, 48, 48]} />
        <meshBasicMaterial color="#4aa3ff" transparent opacity={0.16} side={BackSide} depthWrite={false} />
      </mesh>
      <sprite scale={[radiusUnits * 3.4, radiusUnits * 3.4, 1]}>
        <spriteMaterial map={halo} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.22} />
      </sprite>
    </group>
  );
}
