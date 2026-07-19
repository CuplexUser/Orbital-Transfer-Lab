import { Select, Slider, Stack, Text } from '@mantine/core';
import { MOON_LIST, PLANETS, PLANET_LIST, type CentralBodyId } from '../physics';
import { useOberthBody } from '../state/selectors';
import { useStore } from '../state/store';

const fmtAlt = (km: number) =>
  km >= 1e6 ? `${(km / 1e6).toFixed(2)}M km` : `${Math.round(km).toLocaleString('en-US')} km`;

const fmtDv = (kms: number) => (kms < 0.1 ? `${(kms * 1000).toFixed(0)} m/s` : `${kms.toFixed(2)} km/s`);

const BODY_OPTIONS = [
  { group: 'Star', items: [{ value: 'sun', label: 'Sun' }] },
  { group: 'Planets', items: PLANET_LIST.map((p) => ({ value: p.id, label: p.name })) },
  {
    group: 'Major moons',
    items: MOON_LIST.map((m) => ({ value: m.id, label: `${m.name} (${PLANETS[m.parent].name})` })),
  },
];

export function OberthControls() {
  const body = useOberthBody();
  const periAlt = useStore((s) => s.obPeriAltKm);
  const apoAlt = useStore((s) => s.obApoAltKm);
  const dv = useStore((s) => s.obDvKmS);
  const nuDeg = useStore((s) => s.obBurnNuDeg);
  const setOberth = useStore((s) => s.setOberth);
  const setOberthBody = useStore((s) => s.setOberthBody);

  // All ranges scale with the body: same demo from Enceladus to the Sun.
  const R = body.radiusKm;
  const vCirc = Math.sqrt(body.muKm3S2 / R);
  const periMin = 0.03 * R;
  const periMax = 1.6 * R;
  const periStep = Math.max(1, Math.round(0.008 * R));
  const apoMin = 0.15 * R;
  const apoMax = 63 * R;
  const apoToSlider = (v: number) => (Math.log(v / apoMin) / Math.log(apoMax / apoMin)) * 1000;
  const sliderToApo = (v: number) => apoMin * Math.pow(apoMax / apoMin, v / 1000);
  const margin = 0.016 * R;
  const dvMin = 0.01 * vCirc;
  const dvMax = 0.45 * vCirc;

  return (
    <Stack gap="sm">
      <Select
        label="Central body"
        data={BODY_OPTIONS}
        value={body.id}
        onChange={(v) => v && setOberthBody(v as CentralBodyId)}
        allowDeselect={false}
        searchable
      />
      <div>
        <Text size="sm" mb={2}>
          Periapsis altitude <span className="telemetry-value">{fmtAlt(periAlt)}</span>
        </Text>
        <Slider
          min={periMin}
          max={periMax}
          step={periStep}
          value={periAlt}
          onChange={(v) => setOberth({ obPeriAltKm: Math.min(v, apoAlt - margin) })}
          label={null}
          size="sm"
        />
      </div>
      <div>
        <Text size="sm" mb={2}>
          Apoapsis altitude <span className="telemetry-value">{fmtAlt(apoAlt)}</span>
        </Text>
        <Slider
          min={0}
          max={1000}
          value={apoToSlider(Math.max(apoAlt, apoMin))}
          onChange={(v) => setOberth({ obApoAltKm: Math.max(sliderToApo(v), periAlt + margin) })}
          label={null}
          size="sm"
        />
      </div>
      <div>
        <Text size="sm" mb={2}>
          Burn size <span className="telemetry-value">{fmtDv(dv)} prograde</span>
        </Text>
        <Slider
          min={dvMin}
          max={dvMax}
          step={(dvMax - dvMin) / 200}
          value={dv}
          onChange={(v) => setOberth({ obDvKmS: v })}
          label={null}
          size="sm"
        />
      </div>
      <div>
        <Text size="sm" mb={2}>
          Burn location{' '}
          <span className="telemetry-value">
            {nuDeg === 0 ? 'periapsis' : nuDeg === 180 || nuDeg === -180 ? 'apoapsis' : `${nuDeg}° past periapsis`}
          </span>
        </Text>
        <Slider
          min={-180}
          max={180}
          step={1}
          value={nuDeg}
          onChange={(v) => setOberth({ obBurnNuDeg: v })}
          label={null}
          size="sm"
          marks={[
            { value: -180 }, { value: -90 }, { value: 0 }, { value: 90 }, { value: 180 },
          ]}
        />
      </div>
      <Text size="xs" c="dimmed">
        Drag the burn around the orbit and watch the energy purchase change. The same propellant
        buys the most energy where the craft already moves fastest — deep in {body.name}'s gravity
        well at periapsis. That is the Oberth effect.
      </Text>
    </Stack>
  );
}
