import { describe, expect, it } from 'vitest';
import { PLANETS } from './bodies';
import { MU_SUN } from './constants';
import { vecLength } from './conic';
import { flyby, type FlybyInput } from './flyby';

const jupiterBase: FlybyInput = {
  muSun: MU_SUN,
  muPlanet: PLANETS.jupiter.muKm3S2,
  planetOrbitRadiusKm: PLANETS.jupiter.orbitRadiusKm,
  vInfKmS: 6,
  periapsisRadiusKm: PLANETS.jupiter.bodyRadiusKm * 5,
  approachAngleRad: (160 * Math.PI) / 180,
  accelerate: true,
};

describe('flyby', () => {
  it('conserves speed in the planet frame', () => {
    const r = flyby(jupiterBase);
    expect(vecLength(r.vInfOutVec)).toBeCloseTo(vecLength(r.vInfInVec), 9);
    expect(vecLength(r.vInfInVec)).toBeCloseTo(6, 9);
  });

  it('turn angle follows sin(d/2) = 1/e and shrinks with periapsis distance', () => {
    const near = flyby(jupiterBase);
    expect(Math.sin(near.turnAngleRad / 2)).toBeCloseTo(1 / near.hyperbolaE, 9);
    const far = flyby({ ...jupiterBase, periapsisRadiusKm: PLANETS.jupiter.bodyRadiusKm * 50 });
    expect(far.turnAngleRad).toBeLessThan(near.turnAngleRad);
  });

  it('accelerate always picks the faster branch of the two passing sides', () => {
    const gain = flyby(jupiterBase);
    const lose = flyby({ ...jupiterBase, accelerate: false });
    expect(gain.deltaSpeedKmS).toBeGreaterThan(0);
    expect(gain.speedOutKmS).toBeGreaterThanOrEqual(lose.speedOutKmS);
    expect(gain.speedInKmS).toBeCloseTo(lose.speedInKmS, 9);
  });

  it('a shallow turn can genuinely decelerate the craft', () => {
    // Gentle bend: high vInf + distant periapsis => small turn angle.
    const shallow: FlybyInput = {
      ...jupiterBase,
      vInfKmS: 10,
      periapsisRadiusKm: PLANETS.jupiter.bodyRadiusKm * 50,
      accelerate: false,
    };
    const r = flyby(shallow);
    expect(r.turnAngleRad).toBeLessThan(Math.PI / 4);
    expect(r.deltaSpeedKmS).toBeLessThan(0);
  });

  it('a deep Jupiter flyby can fling an inbound craft onto an escape orbit', () => {
    const r = flyby({ ...jupiterBase, periapsisRadiusKm: PLANETS.jupiter.bodyRadiusKm * 1.5 });
    expect(r.preOrbit.type).toBe('elliptic');
    expect(r.escapesAfter).toBe(true);
  });

  it('never exceeds the vector-sum speed bound |vP| + |vInf|', () => {
    for (const rp of [1.2, 3, 10, 40]) {
      const r = flyby({ ...jupiterBase, periapsisRadiusKm: PLANETS.jupiter.bodyRadiusKm * rp });
      expect(r.speedOutKmS).toBeLessThanOrEqual(r.vPlanetKmS + 6 + 1e-9);
    }
  });
});
