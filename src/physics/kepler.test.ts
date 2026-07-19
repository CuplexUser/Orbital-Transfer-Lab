import { describe, expect, it } from 'vitest';
import { AU_KM, EARTH_RADIUS_KM, MU_EARTH, MU_SUN, SECONDS_PER_DAY } from './constants';
import {
  circularVelocity,
  normalizeAngle,
  normalizeAngleSigned,
  orbitalPeriod,
  radiusAtTrueAnomaly,
  solveKepler,
  trueAnomalyFromEccentric,
  visViva,
} from './kepler';

describe('circularVelocity', () => {
  it('is ~7.905 km/s at Earth surface radius', () => {
    expect(circularVelocity(MU_EARTH, EARTH_RADIUS_KM)).toBeCloseTo(7.905, 2);
  });

  it('is ~29.78 km/s at 1 AU around the Sun', () => {
    expect(circularVelocity(MU_SUN, AU_KM)).toBeCloseTo(29.78, 2);
  });
});

describe('orbitalPeriod', () => {
  it('gives ~365.25 days at 1 AU', () => {
    expect(orbitalPeriod(MU_SUN, AU_KM) / SECONDS_PER_DAY).toBeCloseTo(365.25, 1);
  });
});

describe('visViva', () => {
  it('reduces to circular velocity when r === a', () => {
    const a = 26_000;
    expect(visViva(MU_EARTH, a, a)).toBeCloseTo(circularVelocity(MU_EARTH, a), 12);
  });
});

describe('solveKepler', () => {
  it('returns M when e = 0', () => {
    expect(solveKepler(1.234, 0)).toBeCloseTo(1.234, 12);
  });

  it('round-trips M = E - e*sin(E) at high eccentricity', () => {
    const e = 0.8;
    const E0 = 2.5;
    const M = E0 - e * Math.sin(E0);
    expect(solveKepler(M, e)).toBeCloseTo(E0, 10);
  });

  it('handles the second half of the orbit (E > PI)', () => {
    const e = 0.6;
    const E0 = 4.2;
    const M = E0 - e * Math.sin(E0);
    expect(solveKepler(M, e)).toBeCloseTo(E0, 10);
  });
});

describe('trueAnomalyFromEccentric', () => {
  it('maps E = 0 to nu = 0 and E = PI to nu = PI', () => {
    expect(trueAnomalyFromEccentric(0, 0.5)).toBeCloseTo(0, 12);
    expect(trueAnomalyFromEccentric(Math.PI, 0.5)).toBeCloseTo(Math.PI, 12);
  });
});

describe('radiusAtTrueAnomaly', () => {
  it('gives periapsis a(1-e) at nu = 0 and apoapsis a(1+e) at nu = PI', () => {
    const a = 10_000;
    const e = 0.3;
    expect(radiusAtTrueAnomaly(a, e, 0)).toBeCloseTo(a * (1 - e), 8);
    expect(radiusAtTrueAnomaly(a, e, Math.PI)).toBeCloseTo(a * (1 + e), 8);
  });
});

describe('angle normalization', () => {
  it('normalizeAngle maps into [0, 2PI)', () => {
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(normalizeAngle(5 * Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it('normalizeAngleSigned maps into (-PI, PI]', () => {
    expect(normalizeAngleSigned((3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2, 12);
    expect(normalizeAngleSigned(Math.PI)).toBeCloseTo(Math.PI, 12);
  });
});
