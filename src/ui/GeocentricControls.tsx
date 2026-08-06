import { Button, Group, NumberInput, SegmentedControl, Slider, Stack, Text } from '@mantine/core';
import { GEO_ALTITUDE_KM, MOONS } from '../physics';
import { useStore, type GeoTarget } from '../state/store';

const ALT_MIN = 160;
/** A little past lunar distance, so the slider can reach every orbit the mode draws. */
const ALT_MAX = 400_000;
const SLIDER_STEPS = 1000;

// Log-feel slider: linear slider position <-> exponential altitude.
const altToSlider = (alt: number) =>
  Math.round((Math.log(alt / ALT_MIN) / Math.log(ALT_MAX / ALT_MIN)) * SLIDER_STEPS);
const sliderToAlt = (v: number) =>
  Math.round(ALT_MIN * Math.pow(ALT_MAX / ALT_MIN, v / SLIDER_STEPS));

interface Preset {
  label: string;
  altKm: number;
  hint: string;
}

/** Real orbital regimes, low to high — the spectrum an Earth-orbit lab should cover. */
const PRESETS: Preset[] = [
  { label: 'ISS 420', altKm: 420, hint: 'Low Earth orbit, 92-minute period' },
  { label: 'LEO 1,000', altKm: 1000, hint: 'Upper LEO / imaging satellites' },
  { label: 'GPS 20,200', altKm: 20_200, hint: 'Medium Earth orbit, half-sidereal-day period' },
  {
    label: `GEO ${GEO_ALTITUDE_KM.toLocaleString('en-US')}`,
    altKm: GEO_ALTITUDE_KM,
    hint: 'Geostationary — 24-hour period, fixed over one spot',
  },
  { label: 'Graveyard 36,086', altKm: 36_086, hint: 'Disposal orbit 300 km above GEO' },
];

function AltitudeControl({
  label,
  value,
  onChange,
  presets = PRESETS,
}: {
  label: string;
  value: number;
  onChange: (km: number) => void;
  presets?: Preset[];
}) {
  const clamp = (v: number) => Math.min(ALT_MAX, Math.max(ALT_MIN, v));
  return (
    <Stack gap={6}>
      <NumberInput
        label={label}
        value={value}
        min={ALT_MIN}
        max={ALT_MAX}
        step={100}
        suffix=" km"
        thousandSeparator=","
        onChange={(v) => {
          if (typeof v === 'number') onChange(clamp(v));
        }}
      />
      <Slider
        min={0}
        max={SLIDER_STEPS}
        value={altToSlider(value)}
        onChange={(v) => onChange(sliderToAlt(v))}
        label={null}
        size="sm"
      />
      <Group gap={4}>
        {presets.map((p) => (
          <Button
            key={p.label}
            size="compact-xs"
            variant={value === p.altKm ? 'light' : 'default'}
            onClick={() => onChange(p.altKm)}
            title={p.hint}
          >
            {p.label}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}

export function GeocentricControls() {
  const r1AltitudeKm = useStore((s) => s.r1AltitudeKm);
  const r2AltitudeKm = useStore((s) => s.r2AltitudeKm);
  const geoTarget = useStore((s) => s.geoTarget);
  const status = useStore((s) => s.transfer.status);
  const setR1Altitude = useStore((s) => s.setR1Altitude);
  const setR2Altitude = useStore((s) => s.setR2Altitude);
  const setGeoTarget = useStore((s) => s.setGeoTarget);
  const launchNow = useStore((s) => s.launchNow);
  const scheduleNextWindow = useStore((s) => s.scheduleNextWindow);
  const resetTransfer = useStore((s) => s.resetTransfer);

  const transferActive = status !== 'idle';
  const toMoon = geoTarget === 'moon';
  const sameOrbit = !toMoon && r1AltitudeKm === r2AltitudeKm;

  return (
    <Stack gap="md">
      <AltitudeControl label="Start orbit altitude" value={r1AltitudeKm} onChange={setR1Altitude} />

      <Stack gap={6}>
        <Text size="sm" fw={500}>
          Destination
        </Text>
        <SegmentedControl
          fullWidth
          size="xs"
          value={geoTarget}
          onChange={(v) => setGeoTarget(v as GeoTarget)}
          data={[
            { label: 'Circular orbit', value: 'orbit' },
            { label: 'The Moon', value: 'moon' },
          ]}
        />
      </Stack>

      {toMoon ? (
        <Text size="xs" c="dimmed">
          A translunar injection: one burn out of your parking orbit onto an ellipse whose apogee
          reaches the Moon's orbit at {MOONS.moon.orbitRadiusKm.toLocaleString('en-US')} km. The
          Moon has to arrive at the same place at the same time, so — unlike an empty orbit — this
          one has launch windows.
        </Text>
      ) : (
        <AltitudeControl
          label="Target orbit altitude"
          value={r2AltitudeKm}
          onChange={setR2Altitude}
        />
      )}

      <Button onClick={launchNow} disabled={transferActive || sameOrbit} variant="filled">
        {toMoon ? 'Burn now' : 'Execute transfer'}
      </Button>
      {toMoon && (
        <Button onClick={scheduleNextWindow} disabled={transferActive} variant="light">
          Wait for lunar window
        </Button>
      )}
      {transferActive && (
        <Button onClick={resetTransfer} variant="subtle" color="gray">
          Reset transfer
        </Button>
      )}
      {sameOrbit && (
        <Text size="xs" c="dimmed">
          Start and target orbits are identical — nothing to transfer.
        </Text>
      )}
      {toMoon && (
        <Text size="xs" c="dimmed">
          "Burn now" departs immediately and coasts to lunar distance regardless of where the Moon
          is — watch the miss angle in the telemetry panel. "Wait for lunar window" holds until the
          Moon leads by the right angle, then fires.
        </Text>
      )}
    </Stack>
  );
}
