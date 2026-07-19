import { describe, expect, it } from 'vitest';
import { EARTH_RADIUS_KM, MU_EARTH } from './constants';
import { oberthBurn, type OberthInput } from './oberth';

const base: OberthInput = {
  mu: MU_EARTH,
  periapsisRadiusKm: EARTH_RADIUS_KM + 300,
  apoapsisRadiusKm: EARTH_RADIUS_KM + 40_000,
  burnTrueAnomalyRad: 0,
  dvKmS: 0.5,
};

describe('oberthBurn', () => {
  it('the same burn buys the most energy at periapsis', () => {
    const atPeri = oberthBurn(base);
    const atApo = oberthBurn({ ...base, burnTrueAnomalyRad: Math.PI });
    expect(atPeri.energyGainKm2S2).toBeGreaterThan(atApo.energyGainKm2S2 * 2);
    expect(atPeri.energyGainKm2S2).toBeCloseTo(atPeri.energyGainAtPeriapsis, 6);
    expect(atApo.energyGainKm2S2).toBeCloseTo(atApo.energyGainAtApoapsis, 6);
  });

  it('a prograde periapsis burn raises apoapsis, not periapsis', () => {
    const r = oberthBurn(base);
    expect(r.escapes).toBe(false);
    expect(r.newApoapsisKm!).toBeGreaterThan(base.apoapsisRadiusKm);
    expect(r.newOrbit.p / (1 + r.newOrbit.e)).toBeCloseTo(base.periapsisRadiusKm, 3);
  });

  it('a big enough periapsis burn escapes, with vInfinity reported', () => {
    const r = oberthBurn({ ...base, dvKmS: 3.5 });
    expect(r.escapes).toBe(true);
    expect(r.newApoapsisKm).toBeNull();
    expect(r.vInfinityKmS!).toBeGreaterThan(0);
    expect(r.vInfinityKmS!).toBeCloseTo(Math.sqrt(2 * r.newOrbit.energy), 9);
  });

  it('burn speed matches vis-viva at the burn radius', () => {
    const r = oberthBurn({ ...base, burnTrueAnomalyRad: 1.2 });
    const a = (base.periapsisRadiusKm + base.apoapsisRadiusKm) / 2;
    const expected = Math.sqrt(MU_EARTH * (2 / r.burnRadiusKm - 1 / a));
    expect(r.burnSpeedKmS).toBeCloseTo(expected, 9);
  });

  it('energy gain equals the vis-viva identity v*dv + dv^2/2', () => {
    const r = oberthBurn({ ...base, burnTrueAnomalyRad: 0.7 });
    expect(r.newOrbit.energy - r.initialOrbit.energy).toBeCloseTo(r.energyGainKm2S2, 8);
  });
});
