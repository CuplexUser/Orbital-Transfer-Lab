import { Box, SegmentedControl, Select, Slider, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { PLANETS, PLANET_LIST, flybyHyperbolaPoints, type PlanetId } from '../physics';
import { useFlybyResult } from '../state/selectors';
import { useStore } from '../state/store';

/** Planet-frame view: the actual flyby hyperbola, invisible at heliocentric scale. */
function FlybyInset() {
  const planetId = useStore((s) => s.ssPlanet);
  const vInf = useStore((s) => s.ssVInfKmS);
  const periRadii = useStore((s) => s.ssPeriapsisRadii);
  const result = useFlybyResult();
  const planet = PLANETS[planetId];

  const { pathD, planetR, inArrow, outArrow } = useMemo(() => {
    const rp = planet.bodyRadiusKm * periRadii;
    const rMax = rp * 7;
    const pts = flybyHyperbolaPoints(
      planet.muKm3S2,
      vInf,
      rp,
      result.vInfInVec,
      result.vInfOutVec,
      rMax,
    );
    const W = 280;
    const H = 190;
    const k = (Math.min(W, H) / 2 - 12) / rMax;
    const sx = (p: { x: number; y: number }) => W / 2 + p.x * k;
    const sy = (p: { x: number; y: number }) => H / 2 - p.y * k;
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p).toFixed(1)},${sy(p).toFixed(1)}`).join(' ');
    const arrow = (vec: { x: number; y: number }, sign: 1 | -1) => {
      const len = Math.hypot(vec.x, vec.y) || 1;
      const ux = (vec.x / len) * 52;
      const uy = (vec.y / len) * 52;
      // Incoming arrow points toward the planet from upstream; outgoing away.
      const from = sign === 1 ? { x: W / 2 - ux * 1.7, y: H / 2 + uy * 1.7 } : { x: W / 2, y: H / 2 };
      return {
        x1: from.x + (sign === 1 ? 0 : ux * 0.9),
        y1: from.y - (sign === 1 ? 0 : uy * 0.9),
        x2: from.x + ux * (sign === 1 ? 0.9 : 1.7),
        y2: from.y - uy * (sign === 1 ? 0.9 : 1.7),
      };
    };
    return {
      pathD: d,
      planetR: Math.max(2.5, planet.bodyRadiusKm * k),
      inArrow: arrow(result.vInfInVec, 1),
      outArrow: arrow(result.vInfOutVec, -1),
    };
  }, [planet, periRadii, vInf, result]);

  return (
    <Box className="flyby-inset">
      <Text size="xs" className="panel-title" mb={4}>
        Planet frame
      </Text>
      <svg viewBox="0 0 280 190" width="100%">
        <defs>
          <marker id="arrIn" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#64d2ff" />
          </marker>
          <marker id="arrOut" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#ffb454" />
          </marker>
        </defs>
        <line {...inArrow} stroke="#64d2ff" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#arrIn)" opacity="0.8" />
        <line {...outArrow} stroke="#ffb454" strokeWidth="1.7" markerEnd="url(#arrOut)" opacity="0.95" />
        <path d={pathD} fill="none" stroke="#dbe4f5" strokeWidth="1.6" opacity="0.9" />
        <circle cx="140" cy="95" r={planetR} fill={planet.color} opacity="0.95" />
        <text x="140" y={95 + planetR + 14} textAnchor="middle" className="inset-label">
          {planet.name} · turn {((result.turnAngleRad * 180) / Math.PI).toFixed(0)}°
        </text>
      </svg>
    </Box>
  );
}

export function SlingshotControls() {
  const planetId = useStore((s) => s.ssPlanet);
  const vInf = useStore((s) => s.ssVInfKmS);
  const periRadii = useStore((s) => s.ssPeriapsisRadii);
  const approachDeg = useStore((s) => s.ssApproachDeg);
  const accelerate = useStore((s) => s.ssAccelerate);
  const setSlingshot = useStore((s) => s.setSlingshot);

  return (
    <Stack gap="sm">
      <Select
        label="Assist planet"
        data={PLANET_LIST.map((p) => ({ value: p.id, label: p.name }))}
        value={planetId}
        onChange={(v) => v && setSlingshot({ ssPlanet: v as PlanetId })}
        allowDeselect={false}
      />
      <div>
        <Text size="sm" mb={2}>
          Approach speed v∞ <span className="telemetry-value">{vInf.toFixed(1)} km/s</span>
        </Text>
        <Slider min={1} max={20} step={0.1} value={vInf} onChange={(v) => setSlingshot({ ssVInfKmS: v })} label={null} size="sm" />
      </div>
      <div>
        <Text size="sm" mb={2}>
          Closest approach <span className="telemetry-value">{periRadii.toFixed(1)} radii</span>
        </Text>
        <Slider
          min={1.1}
          max={60}
          step={0.1}
          value={periRadii}
          onChange={(v) => setSlingshot({ ssPeriapsisRadii: v })}
          label={null}
          size="sm"
        />
      </div>
      <div>
        <Text size="sm" mb={2}>
          Approach direction <span className="telemetry-value">{approachDeg.toFixed(0)}°</span>
        </Text>
        <Slider
          min={0}
          max={360}
          step={1}
          value={approachDeg}
          onChange={(v) => setSlingshot({ ssApproachDeg: v })}
          label={null}
          size="sm"
        />
        <Text size="xs" c="dimmed">
          Direction of v∞ relative to the planet's motion (180° = head-on).
        </Text>
      </div>
      <SegmentedControl
        fullWidth
        size="xs"
        value={accelerate ? 'gain' : 'lose'}
        onChange={(v) => setSlingshot({ ssAccelerate: v === 'gain' })}
        data={[
          { label: 'Pass behind — speed up', value: 'gain' },
          { label: 'Pass ahead — slow down', value: 'lose' },
        ]}
      />
      <FlybyInset />
      <Text size="xs" c="dimmed">
        The planet's gravity turns the approach velocity without changing its magnitude — in the
        planet's frame. In the Sun's frame the craft steals (or donates) orbital momentum.
      </Text>
    </Stack>
  );
}
