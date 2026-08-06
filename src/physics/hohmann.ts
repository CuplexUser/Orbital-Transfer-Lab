import {
  circularVelocity,
  meanMotion,
  normalizeAngle,
  normalizeAngleSigned,
  radiusAtTrueAnomaly,
  solveKepler,
  trueAnomalyFromEccentric,
  visViva,
} from './kepler';

export interface HohmannResult {
  /** Magnitude of the departure burn, km/s */
  dv1: number;
  /** Magnitude of the arrival burn, km/s */
  dv2: number;
  dvTotal: number;
  /** Time on the transfer ellipse (half its period), s */
  transferTimeS: number;
  /** Semi-major axis of the transfer ellipse, km */
  aTransfer: number;
  /** Eccentricity of the transfer ellipse */
  eTransfer: number;
  r1: number;
  r2: number;
}

/**
 * Hohmann transfer between two circular coplanar orbits of radii r1 -> r2.
 * Works in both directions (r2 < r1 means the first burn is retrograde and
 * the transfer starts at apoapsis); burn magnitudes are always positive.
 */
export function hohmannTransfer(mu: number, r1: number, r2: number): HohmannResult {
  if (r1 === r2) {
    return { dv1: 0, dv2: 0, dvTotal: 0, transferTimeS: 0, aTransfer: r1, eTransfer: 0, r1, r2 };
  }
  const a = (r1 + r2) / 2;
  const dv1 = Math.abs(visViva(mu, r1, a) - circularVelocity(mu, r1));
  const dv2 = Math.abs(circularVelocity(mu, r2) - visViva(mu, r2, a));
  return {
    dv1,
    dv2,
    dvTotal: dv1 + dv2,
    transferTimeS: Math.PI * Math.sqrt((a * a * a) / mu),
    aTransfer: a,
    eTransfer: Math.abs(r2 - r1) / (r1 + r2),
    r1,
    r2,
  };
}

export interface BurnSpec {
  id: 'depart' | 'arrive';
  /** Along-track Δv: positive is prograde, negative retrograde. km/s */
  dvKmS: number;
  /** Orbit radius where the engine lights, km */
  radiusKm: number;
  /** In-plane angle from the departure point, rad — 0 for departure, PI for arrival */
  phiRad: number;
  speedBeforeKmS: number;
  speedAfterKmS: number;
}

/**
 * The two impulses of a Hohmann transfer, as signed along-track burns.
 * Both are prograde going outward (r2 > r1) and both retrograde coming back in;
 * `hohmannTransfer` reports the same magnitudes unsigned.
 */
export function hohmannBurns(mu: number, r1: number, r2: number): BurnSpec[] {
  if (r1 === r2) return [];
  const a = (r1 + r2) / 2;
  const vCirc1 = circularVelocity(mu, r1);
  const vTransfer1 = visViva(mu, r1, a);
  const vTransfer2 = visViva(mu, r2, a);
  const vCirc2 = circularVelocity(mu, r2);
  return [
    {
      id: 'depart',
      dvKmS: vTransfer1 - vCirc1,
      radiusKm: r1,
      phiRad: 0,
      speedBeforeKmS: vCirc1,
      speedAfterKmS: vTransfer1,
    },
    {
      id: 'arrive',
      dvKmS: vCirc2 - vTransfer2,
      radiusKm: r2,
      phiRad: Math.PI,
      speedBeforeKmS: vTransfer2,
      speedAfterKmS: vCirc2,
    },
  ];
}

/** Synodic period of two circular orbits with periods T1, T2 (s). Infinity if equal. */
export function synodicPeriod(period1S: number, period2S: number): number {
  if (Math.abs(period1S - period2S) < 1e-9 * Math.max(period1S, period2S)) return Infinity;
  return 1 / Math.abs(1 / period1S - 1 / period2S);
}

/**
 * Required phase angle (target ahead of departure body, signed, (-PI, PI])
 * at the moment of departure so the target is met at arrival.
 */
export function departurePhaseAngle(mu: number, r1: number, r2: number): number {
  const { transferTimeS } = hohmannTransfer(mu, r1, r2);
  const n2 = meanMotion(mu, r2);
  return normalizeAngleSigned(Math.PI - n2 * transferTimeS);
}

/**
 * Smallest t >= 0 such that the phase angle (theta2 - theta1) reaches
 * requiredPhase, given mean motions n1, n2. Infinity if the phase never drifts.
 */
export function timeToNextWindow(
  currentPhase: number,
  requiredPhase: number,
  n1: number,
  n2: number,
): number {
  const rate = n2 - n1;
  if (Math.abs(rate) < 1e-15) return Infinity;
  const delta = normalizeAngle(requiredPhase - currentPhase);
  if (delta < 1e-12 || delta > 2 * Math.PI - 1e-12) return 0;
  return rate > 0 ? delta / rate : (delta - 2 * Math.PI) / rate;
}

export interface TransferPoint {
  rKm: number;
  /** In-plane angle traveled from the departure point, [0, PI] */
  phi: number;
}

/**
 * Position on the transfer ellipse tSinceDeparture seconds after the first
 * burn, at physically correct (non-uniform) angular speed via Kepler's
 * equation. Clamps at arrival (phi = PI).
 */
export function transferPolarAt(transfer: HohmannResult, tSinceDepartureS: number): TransferPoint {
  const { aTransfer: a, eTransfer: e, transferTimeS, r1, r2 } = transfer;
  if (transferTimeS === 0) return { rKm: r1, phi: 0 };
  const outward = r2 >= r1;
  const n = Math.PI / transferTimeS; // mean motion of the transfer orbit
  const mSince = Math.min(Math.max(n * tSinceDepartureS, 0), Math.PI);
  const M = outward ? mSince : Math.PI + mSince;
  const E = solveKepler(M, e);
  const nu = trueAnomalyFromEccentric(E, e);
  // Inward transfers run nu: PI -> 2PI; normalize so phi stays in [0, PI]
  // even when nu wraps to 0 exactly at arrival.
  const phi = outward ? nu : normalizeAngle(nu - Math.PI);
  return { rKm: radiusAtTrueAnomaly(a, e, nu), phi };
}
