export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface PlanetSpec {
  id: PlanetId;
  name: string;
  /** Circular-coplanar orbit radius (semi-major axis), km */
  orbitRadiusKm: number;
  /** Physical body radius, km (display only) */
  bodyRadiusKm: number;
  /** Gravitational parameter, km^3/s^2 (used for flyby turning) */
  muKm3S2: number;
  color: string;
  /** Arbitrary orbital phase at t = 0, rad (transfer-planner modes) */
  epochAngleRad: number;
  /** Mean longitude at epoch J2000, deg (missions mode: real positions) */
  meanLongitudeJ2000Deg: number;
}

export const PLANETS: Record<PlanetId, PlanetSpec> = {
  mercury: { id: 'mercury', name: 'Mercury', orbitRadiusKm: 5.7909e7, bodyRadiusKm: 2439.7, muKm3S2: 2.2032e4, color: '#9c9591', epochAngleRad: 5.2, meanLongitudeJ2000Deg: 252.25 },
  venus: { id: 'venus', name: 'Venus', orbitRadiusKm: 1.08209e8, bodyRadiusKm: 6051.8, muKm3S2: 3.24859e5, color: '#e8c46f', epochAngleRad: 2.4, meanLongitudeJ2000Deg: 181.98 },
  earth: { id: 'earth', name: 'Earth', orbitRadiusKm: 1.495978707e8, bodyRadiusKm: 6371, muKm3S2: 3.986004418e5, color: '#4f8fea', epochAngleRad: 0, meanLongitudeJ2000Deg: 100.46 },
  mars: { id: 'mars', name: 'Mars', orbitRadiusKm: 2.279392e8, bodyRadiusKm: 3389.5, muKm3S2: 4.282837e4, color: '#e0663d', epochAngleRad: 1.2, meanLongitudeJ2000Deg: 355.43 },
  jupiter: { id: 'jupiter', name: 'Jupiter', orbitRadiusKm: 7.7857e8, bodyRadiusKm: 69911, muKm3S2: 1.26686534e8, color: '#d8a373', epochAngleRad: 3.6, meanLongitudeJ2000Deg: 34.4 },
  saturn: { id: 'saturn', name: 'Saturn', orbitRadiusKm: 1.433529e9, bodyRadiusKm: 58232, muKm3S2: 3.7931187e7, color: '#e3c98f', epochAngleRad: 0.9, meanLongitudeJ2000Deg: 49.94 },
  uranus: { id: 'uranus', name: 'Uranus', orbitRadiusKm: 2.872463e9, bodyRadiusKm: 25362, muKm3S2: 5.793939e6, color: '#8fd5d8', epochAngleRad: 4.4, meanLongitudeJ2000Deg: 313.23 },
  neptune: { id: 'neptune', name: 'Neptune', orbitRadiusKm: 4.49506e9, bodyRadiusKm: 24622, muKm3S2: 6.836529e6, color: '#4f6fd8', epochAngleRad: 2.0, meanLongitudeJ2000Deg: 304.88 },
};

export const PLANET_LIST: PlanetSpec[] = Object.values(PLANETS);

// ---------------------------------------------------------------------------
// Major moons

export type MoonId =
  | 'moon'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'enceladus'
  | 'titan'
  | 'titania'
  | 'triton';

export interface MoonSpec {
  id: MoonId;
  name: string;
  parent: PlanetId;
  /** Orbit radius around the parent (semi-major axis), km */
  orbitRadiusKm: number;
  bodyRadiusKm: number;
  /** Gravitational parameter, km^3/s^2 (Oberth-lab central body) */
  muKm3S2: number;
  color: string;
  /** Arbitrary orbital phase at t = 0, rad */
  epochAngleRad: number;
  /** Triton orbits backwards */
  retrograde?: boolean;
}

export const MOONS: Record<MoonId, MoonSpec> = {
  moon: { id: 'moon', name: 'Moon', parent: 'earth', orbitRadiusKm: 384_400, bodyRadiusKm: 1737.4, muKm3S2: 4902.8, color: '#c9c5bd', epochAngleRad: 1.1 },
  io: { id: 'io', name: 'Io', parent: 'jupiter', orbitRadiusKm: 421_800, bodyRadiusKm: 1821.6, muKm3S2: 5959.9, color: '#e8d06a', epochAngleRad: 0.4 },
  europa: { id: 'europa', name: 'Europa', parent: 'jupiter', orbitRadiusKm: 671_100, bodyRadiusKm: 1560.8, muKm3S2: 3202.7, color: '#d8c9b4', epochAngleRad: 2.7 },
  ganymede: { id: 'ganymede', name: 'Ganymede', parent: 'jupiter', orbitRadiusKm: 1_070_400, bodyRadiusKm: 2634.1, muKm3S2: 9887.8, color: '#a99c8d', epochAngleRad: 4.6 },
  callisto: { id: 'callisto', name: 'Callisto', parent: 'jupiter', orbitRadiusKm: 1_882_700, bodyRadiusKm: 2410.3, muKm3S2: 7179.3, color: '#8b8178', epochAngleRad: 1.9 },
  enceladus: { id: 'enceladus', name: 'Enceladus', parent: 'saturn', orbitRadiusKm: 238_020, bodyRadiusKm: 252.1, muKm3S2: 7.21, color: '#eef3f6', epochAngleRad: 3.3 },
  titan: { id: 'titan', name: 'Titan', parent: 'saturn', orbitRadiusKm: 1_221_870, bodyRadiusKm: 2574.7, muKm3S2: 8978.1, color: '#d8a24f', epochAngleRad: 0.8 },
  titania: { id: 'titania', name: 'Titania', parent: 'uranus', orbitRadiusKm: 435_910, bodyRadiusKm: 788.4, muKm3S2: 228.3, color: '#b7c4c9', epochAngleRad: 2.2 },
  triton: { id: 'triton', name: 'Triton', parent: 'neptune', orbitRadiusKm: 354_760, bodyRadiusKm: 1353.4, muKm3S2: 1428.5, color: '#d4c2cf', epochAngleRad: 5.0, retrograde: true },
};

export const MOON_LIST: MoonSpec[] = Object.values(MOONS);

export function moonsOf(planetId: PlanetId): MoonSpec[] {
  return MOON_LIST.filter((m) => m.parent === planetId);
}

// ---------------------------------------------------------------------------
// Central bodies (Oberth lab): the Sun, any planet, or any major moon.

export type CentralBodyId = 'sun' | PlanetId | MoonId;

export interface CentralBody {
  id: CentralBodyId;
  name: string;
  kind: 'star' | 'planet' | 'moon';
  radiusKm: number;
  muKm3S2: number;
  color: string;
}

const SUN_BODY: CentralBody = {
  id: 'sun',
  name: 'Sun',
  kind: 'star',
  radiusKm: 695_700,
  muKm3S2: 1.32712440018e11,
  color: '#ffd9a0',
};

export function getCentralBody(id: CentralBodyId): CentralBody {
  if (id === 'sun') return SUN_BODY;
  if (id in PLANETS) {
    const p = PLANETS[id as PlanetId];
    return { id, name: p.name, kind: 'planet', radiusKm: p.bodyRadiusKm, muKm3S2: p.muKm3S2, color: p.color };
  }
  const m = MOONS[id as MoonId];
  return { id, name: m.name, kind: 'moon', radiusKm: m.bodyRadiusKm, muKm3S2: m.muKm3S2, color: m.color };
}
