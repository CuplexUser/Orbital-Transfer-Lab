import { describe, expect, it } from 'vitest';
import {
  apoapsisRadius,
  conicFromState,
  periapsisRadius,
  sampleConic,
  stateAtTrueAnomaly,
} from './conic';
import { MU_EARTH } from './constants';
import { circularVelocity } from './kepler';

describe('conicFromState', () => {
  it('recovers a circular orbit', () => {
    const r = 8000;
    const v = circularVelocity(MU_EARTH, r);
    const el = conicFromState(MU_EARTH, { x: r, y: 0 }, { x: 0, y: v });
    expect(el.e).toBeCloseTo(0, 9);
    expect(el.a).toBeCloseTo(r, 6);
    expect(el.type).toBe('elliptic');
  });

  it('recovers a known ellipse from its periapsis state', () => {
    const rp = 7000;
    const ra = 42_000;
    const a = (rp + ra) / 2;
    const vp = Math.sqrt(MU_EARTH * (2 / rp - 1 / a));
    const el = conicFromState(MU_EARTH, { x: rp, y: 0 }, { x: 0, y: vp });
    expect(el.a).toBeCloseTo(a, 4);
    expect(el.e).toBeCloseTo((ra - rp) / (ra + rp), 9);
    expect(periapsisRadius(el)).toBeCloseTo(rp, 4);
    expect(apoapsisRadius(el)!).toBeCloseTo(ra, 3);
    expect(el.argPeriapsisRad).toBeCloseTo(0, 6);
  });

  it('classifies escape velocity as hyperbolic', () => {
    const r = 10_000;
    const vEsc = Math.sqrt((2 * MU_EARTH) / r);
    const el = conicFromState(MU_EARTH, { x: r, y: 0 }, { x: 0, y: vEsc * 1.1 });
    expect(el.type).toBe('hyperbolic');
    expect(el.energy).toBeGreaterThan(0);
    expect(el.a).toBeLessThan(0);
  });
});

describe('stateAtTrueAnomaly', () => {
  it('round-trips through conicFromState at an arbitrary anomaly', () => {
    const el = conicFromState(
      MU_EARTH,
      { x: 7000, y: 0 },
      { x: 0, y: Math.sqrt(MU_EARTH * (2 / 7000 - 1 / 20_000)) },
    );
    const { rVec, vVec } = stateAtTrueAnomaly(el, 1.1);
    const el2 = conicFromState(MU_EARTH, rVec, vVec);
    expect(el2.a).toBeCloseTo(el.a, 4);
    expect(el2.e).toBeCloseTo(el.e, 9);
    expect(el2.argPeriapsisRad).toBeCloseTo(el.argPeriapsisRad, 6);
  });
});

describe('sampleConic', () => {
  it('closes small ellipses and clips large ones to rMax', () => {
    const small = conicFromState(
      MU_EARTH,
      { x: 7000, y: 0 },
      { x: 0, y: circularVelocity(MU_EARTH, 7000) },
    );
    const pts = sampleConic(small, 50_000, 90);
    expect(pts.length).toBe(91);

    const big = conicFromState(
      MU_EARTH,
      { x: 7000, y: 0 },
      { x: 0, y: Math.sqrt(MU_EARTH * (2 / 7000 - 1 / 100_000)) },
    );
    const clipped = sampleConic(big, 50_000, 90);
    for (const p of clipped) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(50_000 * 1.001);
    }
  });
});
