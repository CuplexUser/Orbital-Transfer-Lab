import { describe, expect, it } from 'vitest';
import { MOONS, PLANETS } from './bodies';
import { EARTH_RADIUS_KM, GEO_ALTITUDE_KM, MU_EARTH, MU_SUN, SECONDS_PER_DAY } from './constants';
import {
  departurePhaseAngle,
  hohmannBurns,
  hohmannTransfer,
  synodicPeriod,
  timeToNextWindow,
  transferPolarAt,
} from './hohmann';
import { meanMotion, orbitalPeriod } from './kepler';

const DEG = Math.PI / 180;

describe('hohmannTransfer: LEO 300 km -> GEO', () => {
  // Pinned to a 300-km LEO; the oft-quoted 3.85 km/s total is for a 185-km LEO.
  const r1 = EARTH_RADIUS_KM + 300;
  const r2 = EARTH_RADIUS_KM + GEO_ALTITUDE_KM;
  const t = hohmannTransfer(MU_EARTH, r1, r2);

  it('departure burn ~2.426 km/s', () => expect(t.dv1).toBeCloseTo(2.426, 2));
  it('arrival burn ~1.467 km/s', () => expect(t.dv2).toBeCloseTo(1.467, 2));
  it('total ~3.89 km/s', () => expect(t.dvTotal).toBeCloseTo(3.89, 2));
  it('transfer time ~18,990 s (~5.3 h)', () => {
    expect(Math.abs(t.transferTimeS - 18_990)).toBeLessThan(60);
  });
});

describe('hohmannTransfer: Earth -> Mars', () => {
  const r1 = PLANETS.earth.orbitRadiusKm;
  const r2 = PLANETS.mars.orbitRadiusKm;
  const t = hohmannTransfer(MU_SUN, r1, r2);

  it('total dv ~5.59 km/s', () => expect(t.dvTotal).toBeCloseTo(5.59, 1));
  it('transfer time ~259 days', () => {
    expect(Math.abs(t.transferTimeS / SECONDS_PER_DAY - 258.9)).toBeLessThan(2);
  });
  it('required phase angle ~44.3 deg', () => {
    const phase = departurePhaseAngle(MU_SUN, r1, r2) / DEG;
    expect(Math.abs(phase - 44.3)).toBeLessThan(0.5);
  });
  it('synodic period ~780 days', () => {
    const syn = synodicPeriod(orbitalPeriod(MU_SUN, r1), orbitalPeriod(MU_SUN, r2));
    expect(Math.abs(syn / SECONDS_PER_DAY - 779.9)).toBeLessThan(3);
  });
});

describe('hohmannTransfer: Earth -> Venus (inward)', () => {
  it('phase angle is negative (target trails), ~-54 deg', () => {
    const phase =
      departurePhaseAngle(MU_SUN, PLANETS.earth.orbitRadiusKm, PLANETS.venus.orbitRadiusKm) / DEG;
    expect(Math.abs(phase - -54)).toBeLessThan(1);
  });
});

describe('hohmannTransfer: symmetry and edge cases', () => {
  it('reversed direction has identical dvTotal and transfer time', () => {
    const fwd = hohmannTransfer(MU_EARTH, 7000, 42_164);
    const rev = hohmannTransfer(MU_EARTH, 42_164, 7000);
    expect(rev.dvTotal).toBeCloseTo(fwd.dvTotal, 10);
    expect(rev.transferTimeS).toBeCloseTo(fwd.transferTimeS, 6);
  });

  it('r1 === r2 yields an all-zero transfer', () => {
    const t = hohmannTransfer(MU_EARTH, 10_000, 10_000);
    expect(t.dv1).toBe(0);
    expect(t.dv2).toBe(0);
    expect(t.dvTotal).toBe(0);
    expect(t.transferTimeS).toBe(0);
  });

  it('synodicPeriod of identical periods is Infinity', () => {
    expect(synodicPeriod(5000, 5000)).toBe(Infinity);
  });
});

describe('hohmannTransfer: LEO 300 km -> lunar distance (TLI)', () => {
  const r1 = EARTH_RADIUS_KM + 300;
  const r2 = MOONS.moon.orbitRadiusKm;
  const t = hohmannTransfer(MU_EARTH, r1, r2);

  it('translunar injection burn ~3.11 km/s', () => expect(t.dv1).toBeCloseTo(3.11, 2));
  it('coasts ~5 days out', () => {
    expect(t.transferTimeS / SECONDS_PER_DAY).toBeCloseTo(4.98, 1);
  });
  it('the Moon must lead by ~114 deg at departure', () => {
    const phase = departurePhaseAngle(MU_EARTH, r1, r2) / DEG;
    expect(Math.abs(phase - 114.4)).toBeLessThan(1);
  });
  it('the transfer ellipse is highly eccentric', () => {
    expect(t.eTransfer).toBeCloseTo(0.966, 3);
  });
});

describe('hohmannBurns', () => {
  it('outward: both burns prograde, magnitudes match hohmannTransfer', () => {
    const r1 = EARTH_RADIUS_KM + 300;
    const r2 = EARTH_RADIUS_KM + GEO_ALTITUDE_KM;
    const t = hohmannTransfer(MU_EARTH, r1, r2);
    const [depart, arrive] = hohmannBurns(MU_EARTH, r1, r2);
    expect(depart.dvKmS).toBeGreaterThan(0);
    expect(arrive.dvKmS).toBeGreaterThan(0);
    expect(depart.dvKmS).toBeCloseTo(t.dv1, 10);
    expect(arrive.dvKmS).toBeCloseTo(t.dv2, 10);
  });

  it('inward: both burns retrograde', () => {
    const [depart, arrive] = hohmannBurns(MU_EARTH, 42_164, 6678);
    expect(depart.dvKmS).toBeLessThan(0);
    expect(arrive.dvKmS).toBeLessThan(0);
  });

  it('burns sit at the transfer endpoints and chain speed-wise', () => {
    const [depart, arrive] = hohmannBurns(MU_EARTH, 6678, 42_164);
    expect(depart.radiusKm).toBe(6678);
    expect(depart.phiRad).toBe(0);
    expect(arrive.radiusKm).toBe(42_164);
    expect(arrive.phiRad).toBeCloseTo(Math.PI, 12);
    expect(depart.speedBeforeKmS + depart.dvKmS).toBeCloseTo(depart.speedAfterKmS, 10);
    expect(arrive.speedBeforeKmS + arrive.dvKmS).toBeCloseTo(arrive.speedAfterKmS, 10);
  });

  it('r1 === r2 yields no burns', () => {
    expect(hohmannBurns(MU_EARTH, 10_000, 10_000)).toEqual([]);
  });
});

describe('timeToNextWindow', () => {
  it('positive drift reaches the phase directly', () => {
    expect(timeToNextWindow(0, 1, 1, 2)).toBeCloseTo(1, 10);
  });

  it('negative drift wraps the other way around', () => {
    expect(timeToNextWindow(0, 1, 2, 1)).toBeCloseTo(2 * Math.PI - 1, 10);
  });

  it('already at the window returns 0', () => {
    expect(timeToNextWindow(0.5, 0.5, 2, 1)).toBe(0);
  });

  it('no drift returns Infinity', () => {
    expect(timeToNextWindow(0, 1, 1, 1)).toBe(Infinity);
  });

  it('Earth->Mars window arrives within one synodic period', () => {
    const r1 = PLANETS.earth.orbitRadiusKm;
    const r2 = PLANETS.mars.orbitRadiusKm;
    const n1 = meanMotion(MU_SUN, r1);
    const n2 = meanMotion(MU_SUN, r2);
    const wait = timeToNextWindow(0.7, departurePhaseAngle(MU_SUN, r1, r2), n1, n2);
    const syn = synodicPeriod(orbitalPeriod(MU_SUN, r1), orbitalPeriod(MU_SUN, r2));
    expect(wait).toBeGreaterThanOrEqual(0);
    expect(wait).toBeLessThanOrEqual(syn);
  });
});

describe('transferPolarAt', () => {
  it('outward: starts at r1/phi=0, ends at r2/phi=PI', () => {
    const t = hohmannTransfer(MU_EARTH, 6678, 42_164);
    const start = transferPolarAt(t, 0);
    expect(start.rKm).toBeCloseTo(6678, 6);
    expect(start.phi).toBeCloseTo(0, 8);
    const end = transferPolarAt(t, t.transferTimeS);
    expect(end.rKm).toBeCloseTo(42_164, 6);
    expect(end.phi).toBeCloseTo(Math.PI, 8);
  });

  it('inward: starts at r1 (apoapsis), ends at r2 (periapsis)', () => {
    const t = hohmannTransfer(MU_EARTH, 42_164, 6678);
    const start = transferPolarAt(t, 0);
    expect(start.rKm).toBeCloseTo(42_164, 6);
    expect(start.phi).toBeCloseTo(0, 8);
    const end = transferPolarAt(t, t.transferTimeS);
    expect(end.rKm).toBeCloseTo(6678, 6);
    expect(end.phi).toBeCloseTo(Math.PI, 8);
  });

  it('moves faster near periapsis than apoapsis (non-uniform speed)', () => {
    const t = hohmannTransfer(MU_EARTH, 6678, 42_164);
    const dt = t.transferTimeS / 100;
    const earlySwept = transferPolarAt(t, dt).phi - transferPolarAt(t, 0).phi;
    const lateSwept = transferPolarAt(t, t.transferTimeS).phi - transferPolarAt(t, t.transferTimeS - dt).phi;
    expect(earlySwept).toBeGreaterThan(lateSwept * 3);
  });

  it('clamps past arrival', () => {
    const t = hohmannTransfer(MU_EARTH, 6678, 42_164);
    const past = transferPolarAt(t, t.transferTimeS * 2);
    expect(past.phi).toBeCloseTo(Math.PI, 8);
  });
});
