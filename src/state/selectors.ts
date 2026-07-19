import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { buildMissionPath, MISSIONS, type MissionPath } from '../data/missions';
import {
  MU_SUN,
  PLANETS,
  flyby,
  getCentralBody,
  hohmannTransfer,
  oberthBurn,
  type CentralBody,
  type FlybyResult,
  type HohmannResult,
  type OberthResult,
} from '../physics';
import { transferInputs, useStore, type TransferInputs } from './store';

export function useTransferInputs(): TransferInputs {
  const [mode, dp, tp, a1, a2] = useStore(
    useShallow((s) => [s.mode, s.departurePlanet, s.targetPlanet, s.r1AltitudeKm, s.r2AltitudeKm] as const),
  );
  return useMemo(() => transferInputs(mode, dp, tp, a1, a2), [mode, dp, tp, a1, a2]);
}

/** The single source of truth for transfer numbers — readouts and geometry both use this. */
export function useHohmannResult(): HohmannResult {
  const { mu, r1, r2 } = useTransferInputs();
  return useMemo(() => hohmannTransfer(mu, r1, r2), [mu, r1, r2]);
}

/** Flyby result for the gravity-assist lab — scene, inset, and readouts all share it. */
export function useFlybyResult(): FlybyResult {
  const [planetId, vInf, periRadii, approachDeg, accelerate] = useStore(
    useShallow((s) => [s.ssPlanet, s.ssVInfKmS, s.ssPeriapsisRadii, s.ssApproachDeg, s.ssAccelerate] as const),
  );
  return useMemo(() => {
    const planet = PLANETS[planetId];
    return flyby({
      muSun: MU_SUN,
      muPlanet: planet.muKm3S2,
      planetOrbitRadiusKm: planet.orbitRadiusKm,
      vInfKmS: vInf,
      periapsisRadiusKm: planet.bodyRadiusKm * periRadii,
      approachAngleRad: (approachDeg * Math.PI) / 180,
      accelerate,
    });
  }, [planetId, vInf, periRadii, approachDeg, accelerate]);
}

/** The Oberth lab's central body (Sun, planet, or moon). */
export function useOberthBody(): CentralBody {
  const id = useStore((s) => s.obBodyId);
  return useMemo(() => getCentralBody(id), [id]);
}

/** Oberth burn result shared by the scene and the readout panel. */
export function useOberthResult(): OberthResult {
  const body = useOberthBody();
  const [periAlt, apoAlt, dv, nuDeg] = useStore(
    useShallow((s) => [s.obPeriAltKm, s.obApoAltKm, s.obDvKmS, s.obBurnNuDeg] as const),
  );
  return useMemo(
    () =>
      oberthBurn({
        mu: body.muKm3S2,
        periapsisRadiusKm: body.radiusKm + periAlt,
        apoapsisRadiusKm: body.radiusKm + apoAlt,
        burnTrueAnomalyRad: (nuDeg * Math.PI) / 180,
        dvKmS: dv,
      }),
    [body, periAlt, apoAlt, dv, nuDeg],
  );
}

/** Prebuilt trajectory for the selected historic mission. */
export function useMissionPath(): MissionPath {
  const missionId = useStore((s) => s.missionId);
  return useMemo(() => buildMissionPath(MISSIONS[missionId]), [missionId]);
}

/**
 * Sim time polled at a UI-friendly rate. The clock itself advances inside
 * useFrame without React re-renders; this hook is for live readouts only.
 */
export function useSimTime(intervalMs = 150): number {
  const [t, setT] = useState(() => useStore.getState().simTimeS);
  useEffect(() => {
    const id = setInterval(() => {
      const cur = useStore.getState().simTimeS;
      setT((prev) => (prev === cur ? prev : cur));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}
