import { SECONDS_PER_DAY, SECONDS_PER_HOUR } from '../physics';

const RAD_TO_DEG = 180 / Math.PI;

export function fmtKmPerS(v: number): string {
  return `${v.toFixed(3)} km/s`;
}

export function fmtDays(seconds: number, digits = 1): string {
  return `${(seconds / SECONDS_PER_DAY).toFixed(digits)} d`;
}

export function fmtDeg(rad: number, digits = 1): string {
  return `${(rad * RAD_TO_DEG).toFixed(digits)}°`;
}

export function fmtHoursMinutes(seconds: number): string {
  const h = Math.floor(seconds / SECONDS_PER_HOUR);
  const m = Math.round((seconds % SECONDS_PER_HOUR) / 60);
  return `${h} h ${String(m).padStart(2, '0')} m`;
}

export function fmtKm(v: number): string {
  return `${Math.round(v).toLocaleString('en-US')} km`;
}

/** Mission clock: h:mm:ss at orbital scales, days (or years) everywhere else. */
export function fmtClock(seconds: number, mode: string): string {
  if (mode === 'geocentric' || mode === 'oberth') {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const days = seconds / SECONDS_PER_DAY;
  if (days >= 3653) return `T+${(days / 365.25).toFixed(1)} yr`;
  return `T+${days.toFixed(1)} d`;
}
