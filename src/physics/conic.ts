/**
 * General 2D conic orbits from state vectors — shared by the gravity-assist
 * and Oberth modes. Plane convention: x = radial-out at reference angle 0,
 * y = prograde; angles counterclockwise.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecScale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function vecLength(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function vecRotate(a: Vec2, angleRad: number): Vec2 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export type ConicType = 'elliptic' | 'hyperbolic';

export interface ConicElements {
  mu: number;
  /** Semi-major axis, km (negative for hyperbolic) */
  a: number;
  e: number;
  /** Semi-latus rectum, km */
  p: number;
  /** Direction of periapsis in the reference frame, rad */
  argPeriapsisRad: number;
  type: ConicType;
  /** Specific orbital energy, km^2/s^2 */
  energy: number;
}

/** Classical elements from a 2D state vector. */
export function conicFromState(mu: number, rVec: Vec2, vVec: Vec2): ConicElements {
  const r = vecLength(rVec);
  const v2 = vVec.x * vVec.x + vVec.y * vVec.y;
  const h = rVec.x * vVec.y - rVec.y * vVec.x; // angular momentum (z)
  const p = (h * h) / mu;
  const rDotV = rVec.x * vVec.x + rVec.y * vVec.y;
  // Eccentricity vector: ((v^2 - mu/r) r - (r.v) v) / mu
  const coefR = v2 - mu / r;
  const eVec: Vec2 = {
    x: (coefR * rVec.x - rDotV * vVec.x) / mu,
    y: (coefR * rVec.y - rDotV * vVec.y) / mu,
  };
  const e = vecLength(eVec);
  const energy = v2 / 2 - mu / r;
  const a = -mu / (2 * energy);
  return {
    mu,
    a,
    e,
    p,
    argPeriapsisRad: e > 1e-12 ? Math.atan2(eVec.y, eVec.x) : Math.atan2(rVec.y, rVec.x),
    type: e < 1 ? 'elliptic' : 'hyperbolic',
    energy,
  };
}

export function periapsisRadius(el: ConicElements): number {
  return el.p / (1 + el.e);
}

/** Apoapsis radius, or null for open (hyperbolic/parabolic) orbits. */
export function apoapsisRadius(el: ConicElements): number | null {
  return el.e < 1 ? el.p / (1 - el.e) : null;
}

/**
 * Sample the conic as 2D points (km), clipped to radius <= rMaxKm.
 * Ellipses that fit entirely inside rMax come back as a closed loop.
 */
export function sampleConic(el: ConicElements, rMaxKm: number, segments = 180): Vec2[] {
  const { e, p, argPeriapsisRad: w } = el;
  const apo = apoapsisRadius(el);
  let nuClip = Math.PI; // full ellipse by default
  const closed = apo !== null && apo <= rMaxKm;
  if (!closed) {
    // r(nu) = p / (1 + e cos nu) = rMax  =>  cos nu = (p/rMax - 1) / e
    const cosClip = (p / rMaxKm - 1) / e;
    nuClip = Math.acos(Math.min(1, Math.max(-1, cosClip)));
  }
  const pts: Vec2[] = [];
  for (let i = 0; i <= segments; i++) {
    const nu = -nuClip + (2 * nuClip * i) / segments;
    const r = p / (1 + e * Math.cos(nu));
    if (r < 0) continue; // beyond hyperbolic asymptote
    const angle = w + nu;
    pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return pts;
}

/** Position (km) and velocity (km/s) on a conic at true anomaly nu, in the reference frame. */
export function stateAtTrueAnomaly(el: ConicElements, nu: number): { rVec: Vec2; vVec: Vec2 } {
  const { mu, p, e, argPeriapsisRad: w } = el;
  const r = p / (1 + e * Math.cos(nu));
  const rPerifocal: Vec2 = { x: r * Math.cos(nu), y: r * Math.sin(nu) };
  const k = Math.sqrt(mu / p);
  const vPerifocal: Vec2 = { x: -k * Math.sin(nu), y: k * (e + Math.cos(nu)) };
  return { rVec: vecRotate(rPerifocal, w), vVec: vecRotate(vPerifocal, w) };
}
