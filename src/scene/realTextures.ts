import { SRGBColorSpace, TextureLoader, type Texture } from 'three';

/**
 * Real photographic maps (NASA Blue Marble Earth, Clementine Moon, Solar
 * System Scope planet maps) served from public/textures. Loaded lazily and
 * cached; three.js updates the material in place once the image arrives, so
 * no Suspense is needed.
 */
const loader = new TextureLoader();
const cache = new Map<string, Texture>();

const tex = (name: string) => `${import.meta.env.BASE_URL}textures/${name}`;

export const EARTH_MAP_URL = tex('earth_atmos_2048.jpg');
export const MOON_MAP_URL = tex('moon_1024.jpg');
export const MERCURY_MAP_URL = tex('mercury_2048.jpg');
export const VENUS_MAP_URL = tex('venus_atmosphere_2048.jpg');
export const MARS_MAP_URL = tex('mars_2048.jpg');
export const JUPITER_MAP_URL = tex('jupiter_2048.jpg');
export const SATURN_MAP_URL = tex('saturn_2048.jpg');
export const SATURN_RING_MAP_URL = tex('saturn_ring_alpha_2048.png');
export const URANUS_MAP_URL = tex('uranus_2048.jpg');
export const NEPTUNE_MAP_URL = tex('neptune_2048.jpg');

const PLANET_MAP_URLS: Record<string, string> = {
  mercury: MERCURY_MAP_URL,
  venus: VENUS_MAP_URL,
  earth: EARTH_MAP_URL,
  mars: MARS_MAP_URL,
  jupiter: JUPITER_MAP_URL,
  saturn: SATURN_MAP_URL,
  uranus: URANUS_MAP_URL,
  neptune: NEPTUNE_MAP_URL,
};

/** Real photographic map for a planet, keyed by PlanetId. */
export function planetMapUrl(id: string): string | undefined {
  return PLANET_MAP_URLS[id];
}

export function realTexture(url: string): Texture {
  const hit = cache.get(url);
  if (hit) return hit;
  const tex = loader.load(url);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(url, tex);
  return tex;
}
