import {
  AU_KM,
  MU_SUN,
  PLANETS,
  SECONDS_PER_DAY,
  meanMotion,
  normalizeAngle,
  type PlanetId,
} from '../physics';

/**
 * Historic mission trajectories. Dates, flyby sequences, and the numbers in
 * the notes are real; the drawn geometry is illustrative — planets follow the
 * circular-coplanar model positioned by their real J2000 mean longitudes, and
 * legs between encounters are smooth interpolations, not integrated orbits.
 */

export type MissionId =
  | 'voyager1'
  | 'voyager2'
  | 'galileo'
  | 'cassini'
  | 'newhorizons'
  | 'messenger'
  | 'juno'
  | 'parker';

interface WaypointDef {
  dateISO: string;
  /** Position taken from this planet's (circular) position at the date */
  planet?: PlanetId;
  /** Explicit polar position (theta absolute, or as offset from previous waypoint) */
  polar?: { rAu: number; thetaDeg?: number; thetaOffsetDeg?: number };
  /** Extra full prograde revolutions on the leg arriving at this waypoint */
  revs?: number;
  event?: { label: string; note?: string };
}

export interface MissionDef {
  id: MissionId;
  name: string;
  color: string;
  blurb: string;
  status: string;
  launchDateISO: string;
  waypoints: WaypointDef[];
  showPlanets: PlanetId[];
  extraRings: { rAu: number; label: string; color: string }[];
  maxAu: number;
}

export const MISSIONS: Record<MissionId, MissionDef> = {
  voyager1: {
    id: 'voyager1',
    name: 'Voyager 1',
    color: '#7dd3fc',
    blurb:
      'Launched two weeks after Voyager 2 on a faster arc, Voyager 1 used Jupiter and Saturn to reach solar escape velocity, then traded the rest of the planetary tour for a close pass of Titan.',
    status: 'Today: ~166 AU from the Sun at 16.9 km/s — the farthest human-made object.',
    launchDateISO: '1977-09-05',
    waypoints: [
      { dateISO: '1977-09-05', planet: 'earth', event: { label: 'Launch', note: 'Titan IIIE-Centaur from Cape Canaveral' } },
      { dateISO: '1979-03-05', planet: 'jupiter', event: { label: 'Jupiter flyby', note: 'Gravity assist to ~16 km/s beyond solar escape; discovered volcanoes on Io' } },
      { dateISO: '1980-11-12', planet: 'saturn', event: { label: 'Saturn + Titan flyby', note: 'The Titan pass bent the trajectory out of the ecliptic — end of the planetary tour' } },
      { dateISO: '1990-02-14', polar: { rAu: 40.5, thetaOffsetDeg: 30 }, event: { label: 'Pale Blue Dot', note: 'Solar-system family portrait taken from ~40 AU' } },
      { dateISO: '2012-08-25', polar: { rAu: 121, thetaOffsetDeg: 20 }, event: { label: 'Interstellar space', note: 'First spacecraft to cross the heliopause' } },
    ],
    showPlanets: ['earth', 'jupiter', 'saturn'],
    extraRings: [],
    maxAu: 126,
  },
  voyager2: {
    id: 'voyager2',
    name: 'Voyager 2',
    color: '#a5b4fc',
    blurb:
      'The only spacecraft to visit all four giant planets, riding a planetary alignment that occurs once every 176 years. Each flyby stole a little of the planet’s orbital momentum to sling it onward.',
    status: 'Today: ~139 AU out at 15.4 km/s, still returning data from interstellar space.',
    launchDateISO: '1977-08-20',
    waypoints: [
      { dateISO: '1977-08-20', planet: 'earth', event: { label: 'Launch', note: '16 days before Voyager 1' } },
      { dateISO: '1979-07-09', planet: 'jupiter', event: { label: 'Jupiter flyby', note: '+~10 km/s heliocentric; imaged Europa’s cracked ice shell' } },
      { dateISO: '1981-08-25', planet: 'saturn', event: { label: 'Saturn flyby', note: 'Set up the Uranus leg of the Grand Tour' } },
      { dateISO: '1986-01-24', planet: 'uranus', event: { label: 'Uranus flyby', note: 'Still the only spacecraft ever to visit' } },
      { dateISO: '1989-08-25', planet: 'neptune', event: { label: 'Neptune flyby', note: 'Great Dark Spot and Triton’s geysers; dived over the north pole' } },
      { dateISO: '2018-11-05', polar: { rAu: 119, thetaOffsetDeg: 18 }, event: { label: 'Interstellar space', note: 'Crossed the heliopause 41 years after launch' } },
    ],
    showPlanets: ['earth', 'jupiter', 'saturn', 'uranus', 'neptune'],
    extraRings: [],
    maxAu: 124,
  },
  galileo: {
    id: 'galileo',
    name: 'Galileo',
    color: '#93c5fd',
    blurb:
      'Deployed from Space Shuttle Atlantis with too little launch energy to reach Jupiter directly, Galileo took the scenic VEEGA route: one Venus and two Earth flybys to build up speed, visiting two asteroids on the way.',
    status: 'Ended 2003-09-21: deliberately plunged into Jupiter to protect Europa’s hidden ocean from contamination.',
    launchDateISO: '1989-10-18',
    waypoints: [
      { dateISO: '1989-10-18', planet: 'earth', event: { label: 'Launch', note: 'Deployed from Shuttle Atlantis (STS-34) with an IUS upper stage' } },
      { dateISO: '1990-02-10', planet: 'venus', event: { label: 'Venus flyby', note: '+2.2 km/s — the first leg of the VEEGA billiards shot' } },
      { dateISO: '1990-12-08', planet: 'earth', event: { label: 'Earth flyby 1', note: '+5.2 km/s' } },
      { dateISO: '1991-10-29', polar: { rAu: 2.2, thetaOffsetDeg: 150 }, event: { label: 'Asteroid Gaspra', note: 'First-ever close pass of an asteroid' } },
      { dateISO: '1992-12-08', planet: 'earth', event: { label: 'Earth flyby 2', note: '+3.7 km/s — finally enough energy for Jupiter' } },
      { dateISO: '1993-08-28', polar: { rAu: 2.86, thetaOffsetDeg: 120 }, event: { label: 'Asteroid Ida', note: 'Discovered Dactyl, the first known asteroid moon' } },
      { dateISO: '1995-12-07', planet: 'jupiter', event: { label: 'Jupiter arrival', note: 'Dropped an atmospheric probe, then 8 years touring the moons' } },
    ],
    showPlanets: ['venus', 'earth', 'mars', 'jupiter'],
    extraRings: [],
    maxAu: 5.6,
  },
  cassini: {
    id: 'cassini',
    name: 'Cassini–Huygens',
    color: '#fcd34d',
    blurb:
      'Too heavy to fly to Saturn directly, Cassini looped inward first: two Venus flybys, one of Earth, and one of Jupiter added a combined ~20 km/s. It then orbited Saturn for 13 years and landed Huygens on Titan.',
    status: 'Ended 2017-09-15: the Grand Finale — 22 dives between Saturn and its rings, then a deliberate plunge into the planet.',
    launchDateISO: '1997-10-15',
    waypoints: [
      { dateISO: '1997-10-15', planet: 'earth', event: { label: 'Launch', note: 'Titan IVB-Centaur, the most powerful US launcher then flying' } },
      { dateISO: '1998-04-26', planet: 'venus', event: { label: 'Venus flyby 1', note: '+7 km/s' } },
      { dateISO: '1999-06-24', planet: 'venus', revs: 1, event: { label: 'Venus flyby 2', note: 'Set up by a deep-space maneuver at 1.6 AU' } },
      { dateISO: '1999-08-18', planet: 'earth', event: { label: 'Earth flyby', note: '+5.5 km/s, just 55 days after Venus' } },
      { dateISO: '2000-12-30', planet: 'jupiter', event: { label: 'Jupiter flyby', note: 'Joint observations with Galileo, then the long cruise' } },
      { dateISO: '2004-07-01', planet: 'saturn', event: { label: 'Saturn orbit insertion', note: '96-minute burn threading the gap between the F and G rings' } },
    ],
    showPlanets: ['venus', 'earth', 'jupiter', 'saturn'],
    extraRings: [],
    maxAu: 10.2,
  },
  newhorizons: {
    id: 'newhorizons',
    name: 'New Horizons',
    color: '#fbbf24',
    blurb:
      'The fastest launch in history — it passed the Moon in nine hours. A single Jupiter gravity assist added 3.9 km/s and cut three years off the cruise to Pluto.',
    status: 'Today: ~63 AU out at ~13.9 km/s, healthy, exploring the Kuiper Belt.',
    launchDateISO: '2006-01-19',
    waypoints: [
      { dateISO: '2006-01-19', planet: 'earth', event: { label: 'Launch', note: 'Atlas V; C3 = 158 km²/s², the fastest departure ever' } },
      { dateISO: '2007-02-28', planet: 'jupiter', event: { label: 'Jupiter gravity assist', note: '+3.9 km/s; trimmed 3 years off the cruise' } },
      { dateISO: '2015-07-14', polar: { rAu: 32.9, thetaDeg: 261 }, event: { label: 'Pluto flyby', note: 'First close look: nitrogen glaciers and the heart of Sputnik Planitia' } },
      { dateISO: '2019-01-01', polar: { rAu: 44.6, thetaDeg: 264 }, event: { label: 'Arrokoth flyby', note: 'Most distant world ever explored up close' } },
    ],
    showPlanets: ['earth', 'jupiter', 'saturn', 'uranus', 'neptune'],
    extraRings: [{ rAu: 32.9, label: 'Pluto (2015 distance)', color: '#c9a58c' }],
    maxAu: 48,
  },
  messenger: {
    id: 'messenger',
    name: 'MESSENGER',
    color: '#a8b8cc',
    blurb:
      'Getting into orbit around Mercury is harder than leaving the solar system — the Sun keeps speeding you up. MESSENGER spent 6.5 years and six flybys bleeding off energy before it could finally be captured.',
    status: 'Ended 2015-04-30: out of propellant after four years in orbit, it impacted Mercury at 3.9 km/s.',
    launchDateISO: '2004-08-03',
    waypoints: [
      { dateISO: '2004-08-03', planet: 'earth', event: { label: 'Launch', note: 'Delta II from Cape Canaveral' } },
      { dateISO: '2005-08-02', planet: 'earth', event: { label: 'Earth flyby', note: 'One year later, back home to bend the orbit inward' } },
      { dateISO: '2006-10-24', planet: 'venus', revs: 1, event: { label: 'Venus flyby 1' } },
      { dateISO: '2007-06-05', planet: 'venus', event: { label: 'Venus flyby 2', note: 'Each pass sheds orbital energy — slowing down is the whole point' } },
      { dateISO: '2008-01-14', planet: 'mercury', event: { label: 'Mercury flyby 1', note: 'First spacecraft at Mercury since Mariner 10 in 1975' } },
      { dateISO: '2008-10-06', planet: 'mercury', revs: 1, event: { label: 'Mercury flyby 2' } },
      { dateISO: '2009-09-29', planet: 'mercury', revs: 1, event: { label: 'Mercury flyby 3' } },
      { dateISO: '2011-03-18', planet: 'mercury', revs: 2, event: { label: 'Mercury orbit insertion', note: 'First spacecraft ever to orbit Mercury' } },
    ],
    showPlanets: ['mercury', 'venus', 'earth'],
    extraRings: [],
    maxAu: 1.12,
  },
  juno: {
    id: 'juno',
    name: 'Juno',
    color: '#6ee7b7',
    blurb:
      'The first solar-powered spacecraft at Jupiter. Juno launched onto a two-year ellipse, fired two deep-space burns beyond Mars, then swung back past Earth for the 3.9 km/s that made Jupiter reachable.',
    status: 'In polar orbit since 2016; the extended mission added flybys of Ganymede (2021), Europa (2022), and Io (2023–24), running through 2025.',
    launchDateISO: '2011-08-05',
    waypoints: [
      { dateISO: '2011-08-05', planet: 'earth', event: { label: 'Launch', note: 'Atlas V 551 from Cape Canaveral' } },
      { dateISO: '2012-08-30', polar: { rAu: 2.26, thetaOffsetDeg: 155 }, event: { label: 'Deep-space maneuvers', note: 'Two burns totalling ~730 m/s beyond the orbit of Mars' } },
      { dateISO: '2013-10-09', planet: 'earth', event: { label: 'Earth flyby', note: '+3.9 km/s — Earth as the final rocket stage' } },
      { dateISO: '2016-07-04', planet: 'jupiter', event: { label: 'Jupiter orbit insertion', note: '35-minute main-engine burn into a 53-day polar orbit' } },
    ],
    showPlanets: ['earth', 'mars', 'jupiter'],
    extraRings: [],
    maxAu: 5.6,
  },
  parker: {
    id: 'parker',
    name: 'Parker Solar Probe',
    color: '#f0abfc',
    blurb:
      'A slingshot campaign in reverse: seven Venus flybys each drained orbital momentum, shrinking the perihelion until the probe flew through the Sun’s corona — the fastest object ever built.',
    status: 'Record: 191 km/s at 6.2 million km from the Sun (2024-12-24). Petal orbits are stylized; flyby dates and distances are real.',
    launchDateISO: '2018-08-12',
    waypoints: [
      { dateISO: '2018-08-12', planet: 'earth', event: { label: 'Launch', note: 'Delta IV Heavy — most launch energy ever expended' } },
      { dateISO: '2018-10-03', planet: 'venus', event: { label: 'Venus flyby 1', note: 'Each flyby lowers perihelion instead of raising it' } },
      { dateISO: '2018-11-06', polar: { rAu: 0.166, thetaOffsetDeg: 170 }, event: { label: 'First perihelion', note: 'Already inside Mercury’s orbit' } },
      { dateISO: '2019-12-26', planet: 'venus' },
      { dateISO: '2020-01-29', polar: { rAu: 0.13, thetaOffsetDeg: 170 } },
      { dateISO: '2020-07-11', planet: 'venus' },
      { dateISO: '2020-09-27', polar: { rAu: 0.095, thetaOffsetDeg: 170 } },
      { dateISO: '2021-02-20', planet: 'venus' },
      { dateISO: '2021-04-29', polar: { rAu: 0.074, thetaOffsetDeg: 170 } },
      { dateISO: '2021-10-16', planet: 'venus' },
      { dateISO: '2021-11-21', polar: { rAu: 0.062, thetaOffsetDeg: 170 } },
      { dateISO: '2023-08-21', planet: 'venus', revs: 1 },
      { dateISO: '2023-09-27', polar: { rAu: 0.053, thetaOffsetDeg: 170 } },
      { dateISO: '2024-11-06', planet: 'venus', event: { label: 'Venus flyby 7', note: 'Final assist: perihelion down to 9.86 solar radii' } },
      { dateISO: '2024-12-24', polar: { rAu: 0.046, thetaOffsetDeg: 170 }, event: { label: 'Closest approach', note: '6.2 million km, 191 km/s, through the solar corona' } },
      { dateISO: '2025-06-19', polar: { rAu: 0.7, thetaOffsetDeg: 160 }, event: { label: 'Mission continues', note: 'Repeating close passes every ~88 days' } },
    ],
    showPlanets: ['mercury', 'venus', 'earth'],
    extraRings: [],
    maxAu: 1.12,
  },
};

export const MISSION_LIST = Object.values(MISSIONS);

// ---------------------------------------------------------------------------

const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DEG = Math.PI / 180;

export function daysSinceJ2000(dateISO: string): number {
  return (Date.parse(`${dateISO}T00:00:00Z`) - J2000_MS) / 86_400_000;
}

/** Planet angle (rad, CCW from reference axis) at a real date — circular model, real mean longitude. */
export function planetAngleAtDate(planetId: PlanetId, dateISO: string): number {
  const spec = PLANETS[planetId];
  const n = meanMotion(MU_SUN, spec.orbitRadiusKm); // rad/s
  return normalizeAngle(
    spec.meanLongitudeJ2000Deg * DEG + n * daysSinceJ2000(dateISO) * SECONDS_PER_DAY,
  );
}

export interface MissionPathPoint {
  tDays: number;
  xAu: number;
  yAu: number;
  rAu: number;
}

export interface MissionPathEvent {
  tDays: number;
  dateISO: string;
  label: string;
  note?: string;
  xAu: number;
  yAu: number;
}

export interface MissionPath {
  points: MissionPathPoint[];
  events: MissionPathEvent[];
  totalDays: number;
}

interface ResolvedWaypoint {
  tDays: number;
  rAu: number;
  thetaRad: number; // unwrapped, monotonically increasing (prograde)
  def: WaypointDef;
}

const smoothstep = (s: number) => s * s * (3 - 2 * s);

export function buildMissionPath(mission: MissionDef): MissionPath {
  const launchDay = daysSinceJ2000(mission.launchDateISO);

  const resolved: ResolvedWaypoint[] = [];
  for (const def of mission.waypoints) {
    const tDays = daysSinceJ2000(def.dateISO) - launchDay;
    let rAu: number;
    let rawTheta: number;
    if (def.planet) {
      rAu = PLANETS[def.planet].orbitRadiusKm / AU_KM;
      rawTheta = planetAngleAtDate(def.planet, def.dateISO);
    } else if (def.polar) {
      rAu = def.polar.rAu;
      if (def.polar.thetaDeg !== undefined) {
        rawTheta = def.polar.thetaDeg * DEG;
      } else {
        const prev = resolved[resolved.length - 1];
        const theta = prev.thetaRad + (def.polar.thetaOffsetDeg ?? 0) * DEG;
        resolved.push({ tDays, rAu, thetaRad: theta, def });
        continue;
      }
    } else {
      throw new Error(`Mission waypoint ${def.dateISO} needs planet or polar`);
    }
    // Unwrap prograde: smallest angle strictly ahead of the previous waypoint.
    const prev = resolved[resolved.length - 1];
    let theta = normalizeAngle(rawTheta);
    if (prev) {
      while (theta <= prev.thetaRad + 1e-9) theta += 2 * Math.PI;
      theta += (def.revs ?? 0) * 2 * Math.PI;
    }
    resolved.push({ tDays, rAu, thetaRad: theta, def });
  }

  const points: MissionPathPoint[] = [];
  const events: MissionPathEvent[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const wp = resolved[i];
    if (wp.def.event) {
      events.push({
        tDays: wp.tDays,
        dateISO: wp.def.dateISO,
        label: wp.def.event.label,
        note: wp.def.event.note,
        xAu: wp.rAu * Math.cos(wp.thetaRad),
        yAu: wp.rAu * Math.sin(wp.thetaRad),
      });
    }
    if (i === 0) {
      points.push({ tDays: wp.tDays, xAu: wp.rAu * Math.cos(wp.thetaRad), yAu: wp.rAu * Math.sin(wp.thetaRad), rAu: wp.rAu });
      continue;
    }
    const prev = resolved[i - 1];
    const sweep = wp.thetaRad - prev.thetaRad;
    const segments = Math.max(24, Math.ceil((sweep / (2 * Math.PI)) * 96));
    for (let k = 1; k <= segments; k++) {
      const s = k / segments;
      const theta = prev.thetaRad + sweep * s;
      const r = prev.rAu + (wp.rAu - prev.rAu) * smoothstep(s);
      points.push({
        tDays: prev.tDays + (wp.tDays - prev.tDays) * s,
        xAu: r * Math.cos(theta),
        yAu: r * Math.sin(theta),
        rAu: r,
      });
    }
  }

  return { points, events, totalDays: resolved[resolved.length - 1].tDays };
}

/** Interpolated ship position at tDays since launch (clamped to the path). */
export function missionShipAt(path: MissionPath, tDays: number): MissionPathPoint {
  const pts = path.points;
  if (tDays <= pts[0].tDays) return pts[0];
  if (tDays >= pts[pts.length - 1].tDays) return pts[pts.length - 1];
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].tDays <= tDays) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const f = (tDays - a.tDays) / (b.tDays - a.tDays || 1);
  return {
    tDays,
    xAu: a.xAu + (b.xAu - a.xAu) * f,
    yAu: a.yAu + (b.yAu - a.yAu) * f,
    rAu: a.rAu + (b.rAu - a.rAu) * f,
  };
}

/** Calendar date string for a mission-elapsed time. */
export function missionDateAt(mission: MissionDef, tDays: number): string {
  const ms = Date.parse(`${mission.launchDateISO}T00:00:00Z`) + tDays * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Per-mission time pacing. One fixed preset list can't serve both Voyager
// (41 mapped years) and Parker (7 years of ~130-day petal orbits), so speeds
// are derived from each mission's duration and snapped to round values.

export function missionTotalDays(mission: MissionDef): number {
  const last = mission.waypoints[mission.waypoints.length - 1];
  return daysSinceJ2000(last.dateISO) - daysSinceJ2000(mission.launchDateISO);
}

const NICE_D_PER_S = [1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 365, 550, 730, 1100, 1460];

const snapNice = (d: number) =>
  NICE_D_PER_S.reduce((best, v) =>
    Math.abs(Math.log(v / d)) < Math.abs(Math.log(best / d)) ? v : best,
  );

/**
 * Four speeds (days per real second, ascending) pacing the full mission to
 * roughly 5 min / 90 s / 30 s / 10 s of watching.
 */
export function missionSpeedPresetsDPerS(totalDays: number): number[] {
  const out: number[] = [];
  for (const seconds of [300, 90, 30, 10]) {
    const v = snapNice(totalDays / seconds);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/** Default clock rate on selecting a mission: the ~90-second pace. */
export function missionDefaultTimescaleS(mission: MissionDef): number {
  const presets = missionSpeedPresetsDPerS(missionTotalDays(mission));
  return (presets[1] ?? presets[0]) * SECONDS_PER_DAY;
}
