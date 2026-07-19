import { Button, Group, NumberInput, Slider, Stack, Text } from '@mantine/core';
import { GEO_ALTITUDE_KM } from '../physics';
import { useStore } from '../state/store';

const ALT_MIN = 160;
const ALT_MAX = 100_000;
const SLIDER_STEPS = 1000;

// Log-feel slider: linear slider position <-> exponential altitude.
const altToSlider = (alt: number) =>
  Math.round((Math.log(alt / ALT_MIN) / Math.log(ALT_MAX / ALT_MIN)) * SLIDER_STEPS);
const sliderToAlt = (v: number) =>
  Math.round(ALT_MIN * Math.pow(ALT_MAX / ALT_MIN, v / SLIDER_STEPS));

const PRESETS = [
  { label: 'LEO 300', altKm: 300 },
  { label: 'MEO 20,200', altKm: 20_200 },
  { label: `GEO ${GEO_ALTITUDE_KM.toLocaleString('en-US')}`, altKm: GEO_ALTITUDE_KM },
];

function AltitudeControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (km: number) => void;
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
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            size="compact-xs"
            variant={value === p.altKm ? 'light' : 'default'}
            onClick={() => onChange(p.altKm)}
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
  const status = useStore((s) => s.transfer.status);
  const setR1Altitude = useStore((s) => s.setR1Altitude);
  const setR2Altitude = useStore((s) => s.setR2Altitude);
  const launchNow = useStore((s) => s.launchNow);
  const resetTransfer = useStore((s) => s.resetTransfer);

  const transferActive = status !== 'idle';
  const sameOrbit = r1AltitudeKm === r2AltitudeKm;

  return (
    <Stack gap="md">
      <AltitudeControl label="Start orbit altitude" value={r1AltitudeKm} onChange={setR1Altitude} />
      <AltitudeControl label="Target orbit altitude" value={r2AltitudeKm} onChange={setR2Altitude} />
      <Button onClick={launchNow} disabled={transferActive || sameOrbit} variant="filled">
        Execute transfer
      </Button>
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
    </Stack>
  );
}
