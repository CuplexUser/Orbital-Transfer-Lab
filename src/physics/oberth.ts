import {
  conicFromState,
  apoapsisRadius,
  stateAtTrueAnomaly,
  vecAdd,
  vecLength,
  vecScale,
  type ConicElements,
  type Vec2,
} from './conic';

/**
 * Oberth-effect demonstrator: a fixed prograde burn applied at a chosen point
 * of an elliptical orbit. The same impulse buys far more orbital energy where
 * the craft moves fastest (periapsis, deep in the gravity well).
 */
export interface OberthInput {
  mu: number;
  periapsisRadiusKm: number;
  apoapsisRadiusKm: number;
  /** Where the burn happens, rad from periapsis */
  burnTrueAnomalyRad: number;
  dvKmS: number;
}

export interface OberthResult {
  initialOrbit: ConicElements;
  newOrbit: ConicElements;
  burnRadiusKm: number;
  burnSpeedKmS: number;
  escapeSpeedAtBurnKmS: number;
  /** Specific energy gained by this burn, km^2/s^2 */
  energyGainKm2S2: number;
  /** Energy the identical burn would gain at periapsis / at apoapsis */
  energyGainAtPeriapsis: number;
  energyGainAtApoapsis: number;
  /** New apoapsis, or null if the orbit becomes hyperbolic */
  newApoapsisKm: number | null;
  /** Hyperbolic excess speed if escaping, km/s */
  vInfinityKmS: number | null;
  escapes: boolean;
  burnPointVec: Vec2;
  velocityBeforeVec: Vec2;
  velocityAfterVec: Vec2;
}

export function oberthBurn(input: OberthInput): OberthResult {
  const { mu, periapsisRadiusKm: rp, apoapsisRadiusKm: ra, burnTrueAnomalyRad: nu, dvKmS } = input;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const initialOrbit: ConicElements = {
    mu,
    a,
    e,
    p: a * (1 - e * e),
    argPeriapsisRad: 0,
    type: 'elliptic',
    energy: -mu / (2 * a),
  };

  const { rVec, vVec } = stateAtTrueAnomaly(initialOrbit, nu);
  const r = vecLength(rVec);
  const v = vecLength(vVec);
  const vAfter = vecAdd(vVec, vecScale(vVec, dvKmS / v)); // prograde impulse
  const newOrbit = conicFromState(mu, rVec, vAfter);

  // dE for a prograde burn: v*dv + dv^2/2 — evaluated at any point of the ellipse.
  const gainAt = (speed: number) => speed * dvKmS + (dvKmS * dvKmS) / 2;
  const vPeri = vecLength(stateAtTrueAnomaly(initialOrbit, 0).vVec);
  const vApo = vecLength(stateAtTrueAnomaly(initialOrbit, Math.PI).vVec);

  const escapes = newOrbit.energy >= 0;
  return {
    initialOrbit,
    newOrbit,
    burnRadiusKm: r,
    burnSpeedKmS: v,
    escapeSpeedAtBurnKmS: Math.sqrt((2 * mu) / r),
    energyGainKm2S2: gainAt(v),
    energyGainAtPeriapsis: gainAt(vPeri),
    energyGainAtApoapsis: gainAt(vApo),
    newApoapsisKm: apoapsisRadius(newOrbit),
    vInfinityKmS: escapes ? Math.sqrt(2 * newOrbit.energy) : null,
    escapes,
    burnPointVec: rVec,
    velocityBeforeVec: vVec,
    velocityAfterVec: vAfter,
  };
}
