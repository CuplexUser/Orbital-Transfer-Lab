import { Tooltip } from '@mantine/core';
import { AU_KM, PLANETS } from '../physics';
import { bodyExaggeration, useRadialInverse, useRadialScale } from '../scene/scale';
import { useViewport } from '../scene/viewport';
import { useStore } from '../state/store';

const TARGET_PX = 130;
const MIN_PX = 46;
const MAX_PX = 260;

/** 1-2-5 ladder around a rough value — the distances a ruler is allowed to show. */
function niceCandidates(roughKm: number): number[] {
  if (!Number.isFinite(roughKm) || roughKm <= 0) return [];
  const decade = Math.floor(Math.log10(roughKm));
  const out: number[] = [];
  for (let d = decade - 1; d <= decade + 1; d++) {
    for (const m of [1, 2, 5]) out.push(m * 10 ** d);
  }
  return out;
}

function fmtDistance(km: number): string {
  if (km >= 0.01 * AU_KM) {
    const au = km / AU_KM;
    return `${au >= 1 ? au.toFixed(au < 10 ? 1 : 0) : au.toFixed(2)} AU`;
  }
  if (km >= 1e6) return `${(km / 1e6).toLocaleString('en-US')} million km`;
  return `${km.toLocaleString('en-US', { maximumFractionDigits: 0 })} km`;
}

/**
 * A ruler for the scene, measured where the camera is actually looking.
 *
 * Distances are the one thing this app can be honest about, so the bar is
 * derived by inverting the active radial scale rather than assuming a constant
 * km-per-unit: under the square-root compressed scale a fixed pixel span means
 * different distances at Mercury and at Neptune, and the label follows.
 */
export function ScaleBar() {
  const { unitsPerPixel, targetRadiusUnits } = useViewport();
  const scaleFn = useRadialScale();
  const invert = useRadialInverse();
  const mode = useStore((s) => s.mode);
  const compressed = useStore((s) => s.compressedScale);
  const sizeMode = useStore((s) => s.bodySizeMode);

  if (unitsPerPixel <= 0) return null;

  const r0Km = invert(targetRadiusUnits);
  const roughKm = invert(targetRadiusUnits + TARGET_PX * unitsPerPixel) - r0Km;

  let barKm = 0;
  let barPx = 0;
  let bestMiss = Infinity;
  for (const candidate of niceCandidates(roughKm)) {
    const px = (scaleFn(r0Km + candidate) - targetRadiusUnits) / unitsPerPixel;
    if (px < MIN_PX || px > MAX_PX) continue;
    const miss = Math.abs(px - TARGET_PX);
    if (miss < bestMiss) {
      bestMiss = miss;
      barKm = candidate;
      barPx = px;
    }
  }
  if (barKm === 0) return null;

  // Geocentric and Oberth draw their central body straight through the radial
  // scale, so those views are already 1:1 and the size mode doesn't apply.
  const helio = mode === 'heliocentric' || mode === 'slingshot' || mode === 'missions';
  const exaggeration = helio ? bodyExaggeration(PLANETS.earth.bodyRadiusKm, sizeMode, scaleFn) : 1;

  const distanceNote =
    mode === 'geocentric'
      ? 'distances true'
      : helio && compressed
        ? 'distances √-compressed'
        : 'distances linear';
  const bodyNote =
    exaggeration < 1.05
      ? 'bodies true size'
      : `bodies ×${Math.round(exaggeration).toLocaleString('en-US')}`;

  return (
    <div className="scale-bar" aria-label={`Scale: ${fmtDistance(barKm)}`}>
      <div className="scale-bar-ruler" style={{ width: `${Math.round(barPx)}px` }}>
        <span className="scale-bar-tick" />
        <span className="scale-bar-line" />
        <span className="scale-bar-tick" />
      </div>
      <div className="scale-bar-label">{fmtDistance(barKm)}</div>
      <Tooltip
        multiline
        w={250}
        withArrow
        label={
          helio
            ? 'Planets have to be drawn far larger than life or they would be single pixels at these distances. Switch body sizes to “Proportional” or “True” in the panel to see the honest version.'
            : 'Earth, the Moon and their orbits are all drawn to the same true scale here — 1,000 km per scene unit.'
        }
      >
        <div className="scale-bar-note">
          {distanceNote} · {bodyNote}
        </div>
      </Tooltip>
    </div>
  );
}
