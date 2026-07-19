import { SRGBColorSpace, TextureLoader, type Texture } from 'three';

/**
 * Real photographic maps (NASA Blue Marble Earth, Clementine Moon) served
 * from public/textures. Loaded lazily and cached; three.js updates the
 * material in place once the image arrives, so no Suspense is needed.
 */
const loader = new TextureLoader();
const cache = new Map<string, Texture>();

export const EARTH_MAP_URL = `${import.meta.env.BASE_URL}textures/earth_atmos_2048.jpg`;
export const MOON_MAP_URL = `${import.meta.env.BASE_URL}textures/moon_1024.jpg`;

export function realTexture(url: string): Texture {
  const hit = cache.get(url);
  if (hit) return hit;
  const tex = loader.load(url);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(url, tex);
  return tex;
}
