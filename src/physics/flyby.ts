import { conicFromState, vecAdd, vecLength, vecRotate, type ConicElements, type Vec2 } from './conic';
import { circularVelocity } from './kepler';

/**
 * Patched-conic gravity assist. The planet sits at reference angle 0 of its
 * circular orbit; frame axes: x = radial-out, y = prograde (planet velocity).
 */
export interface FlybyInput {
  muSun: number;
  muPlanet: number;
  planetOrbitRadiusKm: number;
  /** Hyperbolic excess speed relative to the planet, km/s */
  vInfKmS: number;
  /** Closest-approach distance from the planet's center, km */
  periapsisRadiusKm: number;
  /**
   * Direction the incoming v-infinity points, measured from the planet's
   * prograde direction, rad. ~PI for a typical arrival from an inner orbit
   * (the planet overtakes the spacecraft).
   */
  approachAngleRad: number;
  /** Pass on the side that speeds the spacecraft up (true) or slows it (false). */
  accelerate: boolean;
}

export interface FlybyResult {
  /** Rotation of v-infinity produced by the flyby, rad */
  turnAngleRad: number;
  vPlanetKmS: number;
  vInfInVec: Vec2;
  vInfOutVec: Vec2;
  /** Heliocentric velocity before/after, km/s */
  vInVec: Vec2;
  vOutVec: Vec2;
  speedInKmS: number;
  speedOutKmS: number;
  /** Heliocentric speed change (signed) */
  deltaSpeedKmS: number;
  /** Impulse an engine would have needed for the same velocity change, km/s */
  equivalentDvKmS: number;
  /** Eccentricity of the planet-frame hyperbola */
  hyperbolaE: number;
  preOrbit: ConicElements;
  postOrbit: ConicElements;
  escapesAfter: boolean;
}

export function flyby(input: FlybyInput): FlybyResult {
  const { muSun, muPlanet, planetOrbitRadiusKm: d, vInfKmS, periapsisRadiusKm, approachAngleRad } = input;

  const vPlanet = circularVelocity(muSun, d);
  const vPlanetVec: Vec2 = { x: 0, y: vPlanet };

  // Incoming v-infinity, angle measured from prograde (+y) toward radial-out (+x).
  const vInfInVec: Vec2 = {
    x: vInfKmS * Math.sin(approachAngleRad),
    y: vInfKmS * Math.cos(approachAngleRad),
  };

  // Turn angle: sin(delta/2) = 1 / (1 + rp*vInf^2/mu)
  const hyperbolaE = 1 + (periapsisRadiusKm * vInfKmS * vInfKmS) / muPlanet;
  const turnAngleRad = 2 * Math.asin(1 / hyperbolaE);

  // The passing side sets the rotation sign; pick the one matching the request.
  const outPlus = vecRotate(vInfInVec, turnAngleRad);
  const outMinus = vecRotate(vInfInVec, -turnAngleRad);
  const speedPlus = vecLength(vecAdd(vPlanetVec, outPlus));
  const speedMinus = vecLength(vecAdd(vPlanetVec, outMinus));
  const plusIsFaster = speedPlus >= speedMinus;
  const vInfOutVec = input.accelerate === plusIsFaster ? outPlus : outMinus;

  const vInVec = vecAdd(vPlanetVec, vInfInVec);
  const vOutVec = vecAdd(vPlanetVec, vInfOutVec);
  const speedInKmS = vecLength(vInVec);
  const speedOutKmS = vecLength(vOutVec);

  const rVec: Vec2 = { x: d, y: 0 };
  const preOrbit = conicFromState(muSun, rVec, vInVec);
  const postOrbit = conicFromState(muSun, rVec, vOutVec);

  return {
    turnAngleRad,
    vPlanetKmS: vPlanet,
    vInfInVec,
    vInfOutVec,
    vInVec,
    vOutVec,
    speedInKmS,
    speedOutKmS,
    deltaSpeedKmS: speedOutKmS - speedInKmS,
    equivalentDvKmS: vecLength({ x: vOutVec.x - vInVec.x, y: vOutVec.y - vInVec.y }),
    hyperbolaE,
    preOrbit,
    postOrbit,
    escapesAfter: postOrbit.energy >= 0,
  };
}

/**
 * Planet-frame flyby hyperbola sampled in km, oriented so the incoming
 * asymptote matches vInfInVec. For the inset diagram.
 */
export function flybyHyperbolaPoints(
  muPlanet: number,
  vInfKmS: number,
  periapsisRadiusKm: number,
  vInfInVec: Vec2,
  vInfOutVec: Vec2,
  rMaxKm: number,
  segments = 128,
): Vec2[] {
  const e = 1 + (periapsisRadiusKm * vInfKmS * vInfKmS) / muPlanet;
  const p = periapsisRadiusKm * (1 + e);
  // Periapsis direction bisects the (outgoing - incoming-reversed) asymptotes.
  const inUnit = vecRotate(vInfInVec, Math.PI); // direction back along approach
  const outUnit = vInfOutVec;
  const bisector = vecAdd(
    { x: inUnit.x / vecLength(inUnit), y: inUnit.y / vecLength(inUnit) },
    { x: outUnit.x / vecLength(outUnit), y: outUnit.y / vecLength(outUnit) },
  );
  const argPeri = Math.atan2(bisector.y, bisector.x);
  const cosClip = (p / rMaxKm - 1) / e;
  const nuClip = Math.acos(Math.min(1, Math.max(-1, cosClip)));
  const pts: Vec2[] = [];
  for (let i = 0; i <= segments; i++) {
    const nu = -nuClip + (2 * nuClip * i) / segments;
    const r = p / (1 + e * Math.cos(nu));
    if (r < 0) continue;
    pts.push({ x: r * Math.cos(argPeri + nu), y: r * Math.sin(argPeri + nu) });
  }
  return pts;
}
