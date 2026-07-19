const TWO_PI = 2 * Math.PI;

/** Circular orbit speed at radius r, km/s */
export function circularVelocity(mu: number, r: number): number {
  return Math.sqrt(mu / r);
}

/** Speed on an orbit of semi-major axis a at radius r (vis-viva), km/s */
export function visViva(mu: number, r: number, a: number): number {
  return Math.sqrt(mu * (2 / r - 1 / a));
}

/** Orbital period for semi-major axis a, seconds */
export function orbitalPeriod(mu: number, a: number): number {
  return TWO_PI * Math.sqrt((a * a * a) / mu);
}

/** Mean motion for semi-major axis a, rad/s */
export function meanMotion(mu: number, a: number): number {
  return Math.sqrt(mu / (a * a * a));
}

/** Normalize an angle to [0, 2*PI) */
export function normalizeAngle(theta: number): number {
  const t = theta % TWO_PI;
  return t < 0 ? t + TWO_PI : t;
}

/** Normalize an angle to (-PI, PI] */
export function normalizeAngleSigned(theta: number): number {
  const t = normalizeAngle(theta);
  return t > Math.PI ? t - TWO_PI : t;
}

/**
 * Solve Kepler's equation M = E - e*sin(E) for the eccentric anomaly E.
 * Newton iteration; M may be any value, E is returned in [0, 2*PI).
 */
export function solveKepler(M: number, e: number, tolerance = 1e-12): number {
  const m = normalizeAngle(M);
  if (e === 0) return m;
  // Starting guess biased toward the correct half-plane for high eccentricity.
  let E = e < 0.8 ? m : Math.PI;
  for (let i = 0; i < 64; i++) {
    const f = E - e * Math.sin(E) - m;
    if (Math.abs(f) < tolerance) break;
    E -= f / (1 - e * Math.cos(E));
  }
  return normalizeAngle(E);
}

/** True anomaly from eccentric anomaly; E in [0, 2*PI) maps to nu in [0, 2*PI). */
export function trueAnomalyFromEccentric(E: number, e: number): number {
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );
  return normalizeAngle(nu);
}

/** Orbit radius at true anomaly nu: r = a(1-e^2) / (1 + e*cos(nu)) */
export function radiusAtTrueAnomaly(a: number, e: number, nu: number): number {
  return (a * (1 - e * e)) / (1 + e * Math.cos(nu));
}
