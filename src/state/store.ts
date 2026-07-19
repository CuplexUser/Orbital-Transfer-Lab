import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EARTH_RADIUS_KM,
  GEO_ALTITUDE_KM,
  MU_EARTH,
  MU_SUN,
  PLANETS,
  departurePhaseAngle,
  getCentralBody,
  hohmannTransfer,
  meanMotion,
  normalizeAngleSigned,
  timeToNextWindow,
  type CentralBodyId,
  type PlanetId,
} from '../physics';

import { MISSIONS, missionDefaultTimescaleS, type MissionId } from '../data/missions';

export type Mode = 'heliocentric' | 'geocentric' | 'slingshot' | 'oberth' | 'missions';
export type TransferStatus = 'idle' | 'scheduled' | 'inTransit' | 'arrived';

export interface TransferInfo {
  status: TransferStatus;
  departureTimeS: number;
  departureAngleRad: number;
}

const IDLE_TRANSFER: TransferInfo = { status: 'idle', departureTimeS: 0, departureAngleRad: 0 };

export const HELIO_DEFAULT_TIMESCALE = 15 * 86400; // 15 sim-days per real second
export const GEO_DEFAULT_TIMESCALE = 1800; // 30 sim-minutes per real second
const DEFAULT_TIMESCALE: Record<Exclude<Mode, 'missions'>, number> = {
  heliocentric: HELIO_DEFAULT_TIMESCALE,
  geocentric: GEO_DEFAULT_TIMESCALE,
  slingshot: HELIO_DEFAULT_TIMESCALE,
  oberth: GEO_DEFAULT_TIMESCALE,
};

/** Missions pace their own clock — presets derive from each mission's duration. */
function defaultTimescaleFor(mode: Mode, missionId: MissionId): number {
  return mode === 'missions'
    ? missionDefaultTimescaleS(MISSIONS[missionId])
    : DEFAULT_TIMESCALE[mode];
}

export interface TransferInputs {
  mu: number;
  r1: number;
  r2: number;
}

export function transferInputs(
  mode: Mode,
  departurePlanet: PlanetId,
  targetPlanet: PlanetId,
  r1AltitudeKm: number,
  r2AltitudeKm: number,
): TransferInputs {
  if (mode === 'heliocentric') {
    return {
      mu: MU_SUN,
      r1: PLANETS[departurePlanet].orbitRadiusKm,
      r2: PLANETS[targetPlanet].orbitRadiusKm,
    };
  }
  return { mu: MU_EARTH, r1: EARTH_RADIUS_KM + r1AltitudeKm, r2: EARTH_RADIUS_KM + r2AltitudeKm };
}

type ConfigSlice = Pick<
  AppState,
  'mode' | 'departurePlanet' | 'targetPlanet' | 'r1AltitudeKm' | 'r2AltitudeKm'
>;

export function inputsFromState(s: ConfigSlice): TransferInputs {
  return transferInputs(s.mode, s.departurePlanet, s.targetPlanet, s.r1AltitudeKm, s.r2AltitudeKm);
}

/** Angle of the ship's host (departure planet, or the ship's own circular orbit) at a given sim time. */
export function departureBodyAngleAt(s: ConfigSlice, timeS: number): number {
  const { mu, r1 } = inputsFromState(s);
  const epoch = s.mode === 'heliocentric' ? PLANETS[s.departurePlanet].epochAngleRad : 0;
  return epoch + meanMotion(mu, r1) * timeS;
}

export interface AppState {
  mode: Mode;
  departurePlanet: PlanetId;
  targetPlanet: PlanetId;
  compressedScale: boolean;
  r1AltitudeKm: number;
  r2AltitudeKm: number;
  simTimeS: number;
  playing: boolean;
  /** Sim seconds per real second */
  timeScale: number;
  transfer: TransferInfo;
  /** Postprocessing (bloom etc.) on/off */
  effectsEnabled: boolean;

  // Gravity-assist lab
  ssPlanet: PlanetId;
  ssVInfKmS: number;
  /** Closest approach, in planet radii from the center */
  ssPeriapsisRadii: number;
  ssApproachDeg: number;
  ssAccelerate: boolean;

  // Oberth lab
  obBodyId: CentralBodyId;
  obPeriAltKm: number;
  obApoAltKm: number;
  obDvKmS: number;
  obBurnNuDeg: number;

  // Missions
  missionId: MissionId;

  /** Camera focus target: 'sun' (scene center), a planet id, 'moon', or 'ship' */
  focusId: string;

  // UI layout preferences (persisted)
  navbarWidth: number;
  navbarCollapsed: boolean;
  telemetryCollapsed: boolean;

  setMode(mode: Mode): void;
  setDeparturePlanet(id: PlanetId): void;
  setTargetPlanet(id: PlanetId): void;
  setCompressedScale(on: boolean): void;
  setR1Altitude(km: number): void;
  setR2Altitude(km: number): void;
  setPlaying(playing: boolean): void;
  setTimeScale(scale: number): void;
  setEffectsEnabled(on: boolean): void;
  setSlingshot(patch: Partial<Pick<AppState, 'ssPlanet' | 'ssVInfKmS' | 'ssPeriapsisRadii' | 'ssApproachDeg' | 'ssAccelerate'>>): void;
  setOberth(patch: Partial<Pick<AppState, 'obPeriAltKm' | 'obApoAltKm' | 'obDvKmS' | 'obBurnNuDeg'>>): void;
  /** Switch the Oberth central body and reset the orbit to sensible body-scaled defaults */
  setOberthBody(id: CentralBodyId): void;
  setMissionId(id: MissionId): void;
  setFocus(id: string): void;
  setNavbarWidth(px: number): void;
  setNavbarCollapsed(collapsed: boolean): void;
  setTelemetryCollapsed(collapsed: boolean): void;
  resetSim(): void;
  resetTransfer(): void;
  launchNow(): void;
  scheduleNextWindow(): void;
  advanceTime(dtS: number): void;
}

/** Body-scaled Oberth defaults — the Earth values (300 / 40,000 km, 0.6 km/s) generalized. */
export function oberthDefaults(id: CentralBodyId) {
  const body = getCentralBody(id);
  const R = body.radiusKm;
  const vCirc = Math.sqrt(body.muKm3S2 / R);
  const round3 = (v: number) => Number(v.toPrecision(3));
  return {
    obBodyId: id,
    obPeriAltKm: round3(0.047 * R),
    obApoAltKm: round3(6.3 * R),
    obDvKmS: Math.max(0.001, round3(0.076 * vCirc)),
    obBurnNuDeg: 0,
  };
}

export const useStore = create<AppState>()(persist((set, get) => ({
  mode: 'heliocentric',
  departurePlanet: 'earth',
  targetPlanet: 'mars',
  compressedScale: false,
  r1AltitudeKm: 300,
  r2AltitudeKm: GEO_ALTITUDE_KM,
  simTimeS: 0,
  playing: true,
  timeScale: HELIO_DEFAULT_TIMESCALE,
  transfer: IDLE_TRANSFER,
  effectsEnabled: true,

  ssPlanet: 'jupiter',
  ssVInfKmS: 6,
  ssPeriapsisRadii: 5,
  ssApproachDeg: 160,
  ssAccelerate: true,

  obBodyId: 'earth',
  obPeriAltKm: 300,
  obApoAltKm: 40_000,
  obDvKmS: 0.6,
  obBurnNuDeg: 0,

  missionId: 'voyager2',

  focusId: 'sun',

  navbarWidth: 340,
  navbarCollapsed: false,
  telemetryCollapsed: false,

  setMode: (mode) =>
    set({
      mode,
      simTimeS: 0,
      playing: mode === 'heliocentric' || mode === 'missions',
      transfer: IDLE_TRANSFER,
      timeScale: defaultTimescaleFor(mode, get().missionId),
      focusId: 'sun',
    }),
  setDeparturePlanet: (id) => set({ departurePlanet: id, transfer: IDLE_TRANSFER }),
  setTargetPlanet: (id) => set({ targetPlanet: id, transfer: IDLE_TRANSFER }),
  setCompressedScale: (on) => set({ compressedScale: on }),
  setR1Altitude: (km) => set({ r1AltitudeKm: km, transfer: IDLE_TRANSFER }),
  setR2Altitude: (km) => set({ r2AltitudeKm: km, transfer: IDLE_TRANSFER }),
  setPlaying: (playing) => set({ playing }),
  setTimeScale: (timeScale) => set({ timeScale }),
  setEffectsEnabled: (effectsEnabled) => set({ effectsEnabled }),
  setSlingshot: (patch) => set(patch),
  setOberth: (patch) => set(patch),
  setOberthBody: (id) => set(oberthDefaults(id)),
  setMissionId: (missionId) =>
    set({
      missionId,
      simTimeS: 0,
      playing: true,
      focusId: 'sun',
      timeScale: missionDefaultTimescaleS(MISSIONS[missionId]),
    }),
  setFocus: (focusId) => set({ focusId }),
  setNavbarWidth: (navbarWidth) => set({ navbarWidth }),
  setNavbarCollapsed: (navbarCollapsed) => set({ navbarCollapsed }),
  setTelemetryCollapsed: (telemetryCollapsed) => set({ telemetryCollapsed }),
  resetSim: () => set({ simTimeS: 0, playing: false, transfer: IDLE_TRANSFER }),
  resetTransfer: () => set({ transfer: IDLE_TRANSFER }),

  launchNow: () => {
    const s = get();
    const { r1, r2 } = inputsFromState(s);
    if (r1 === r2) return;
    set({
      playing: true,
      transfer: {
        status: 'inTransit',
        departureTimeS: s.simTimeS,
        departureAngleRad: departureBodyAngleAt(s, s.simTimeS),
      },
    });
  },

  scheduleNextWindow: () => {
    const s = get();
    if (s.mode !== 'heliocentric') return;
    const { mu, r1, r2 } = inputsFromState(s);
    if (r1 === r2) return;
    const n1 = meanMotion(mu, r1);
    const n2 = meanMotion(mu, r2);
    const theta1 = departureBodyAngleAt(s, s.simTimeS);
    const theta2 = PLANETS[s.targetPlanet].epochAngleRad + n2 * s.simTimeS;
    const wait = timeToNextWindow(
      normalizeAngleSigned(theta2 - theta1),
      departurePhaseAngle(mu, r1, r2),
      n1,
      n2,
    );
    if (!Number.isFinite(wait)) return;
    const departureTimeS = s.simTimeS + wait;
    set({
      playing: true,
      transfer: {
        status: wait < 1 ? 'inTransit' : 'scheduled',
        departureTimeS,
        departureAngleRad: departureBodyAngleAt(s, departureTimeS),
      },
    });
  },

  advanceTime: (dtS) => {
    const s = get();
    const t = s.simTimeS + dtS;
    let transfer = s.transfer;
    if (transfer.status === 'scheduled' && t >= transfer.departureTimeS) {
      transfer = { ...transfer, status: 'inTransit' };
    }
    if (transfer.status === 'inTransit') {
      const { mu, r1, r2 } = inputsFromState(s);
      const { transferTimeS } = hohmannTransfer(mu, r1, r2);
      if (t >= transfer.departureTimeS + transferTimeS) {
        transfer = { ...transfer, status: 'arrived' };
      }
    }
    set(transfer === s.transfer ? { simTimeS: t } : { simTimeS: t, transfer });
  },
}), {
  name: 'orbital-lab-prefs',
  partialize: (s) => ({
    navbarWidth: s.navbarWidth,
    navbarCollapsed: s.navbarCollapsed,
    telemetryCollapsed: s.telemetryCollapsed,
    effectsEnabled: s.effectsEnabled,
  }),
}));
