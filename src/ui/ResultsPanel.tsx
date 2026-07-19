import { Badge, Card, Divider, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import {
  AU_KM,
  MU_SUN,
  PLANETS,
  SECONDS_PER_DAY,
  apoapsisRadius,
  circularVelocity,
  departurePhaseAngle,
  meanMotion,
  normalizeAngleSigned,
  orbitalPeriod,
  periapsisRadius,
  synodicPeriod,
  timeToNextWindow,
  type ConicElements,
} from '../physics';
import { MISSIONS, missionDateAt, missionShipAt } from '../data/missions';
import {
  useFlybyResult,
  useHohmannResult,
  useMissionPath,
  useOberthBody,
  useOberthResult,
  useSimTime,
  useTransferInputs,
} from '../state/selectors';
import { useStore } from '../state/store';
import { fmtDays, fmtDeg, fmtHoursMinutes, fmtKm, fmtKmPerS } from './fmt';

function Row({ label, value, dim = false }: { label: string; value: ReactNode; dim?: boolean }) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
        {label}
      </Text>
      <Text size="sm" className={dim ? 'telemetry-value telemetry-dim' : 'telemetry-value'}>
        {value}
      </Text>
    </Group>
  );
}

const STATUS_LABEL = {
  idle: 'Standby',
  scheduled: 'Awaiting window',
  inTransit: 'In transit',
  arrived: 'Arrived',
} as const;

const STATUS_COLOR = {
  idle: 'gray',
  scheduled: 'ice',
  inTransit: 'orange',
  arrived: 'teal',
} as const;

function TransferResults() {
  const mode = useStore((s) => s.mode);
  const status = useStore((s) => s.transfer.status);
  const departureTimeS = useStore((s) => s.transfer.departureTimeS);
  const departurePlanet = useStore((s) => s.departurePlanet);
  const targetPlanet = useStore((s) => s.targetPlanet);
  const { mu, r1, r2 } = useTransferInputs();
  const result = useHohmannResult();
  const t = useSimTime();

  const helio = mode === 'heliocentric';

  let liveRows: ReactNode = null;
  if (helio && r1 !== r2) {
    const dep = PLANETS[departurePlanet];
    const tgt = PLANETS[targetPlanet];
    const n1 = meanMotion(MU_SUN, r1);
    const n2 = meanMotion(MU_SUN, r2);
    const currentPhase = normalizeAngleSigned(
      tgt.epochAngleRad + n2 * t - (dep.epochAngleRad + n1 * t),
    );
    const requiredPhase = departurePhaseAngle(mu, r1, r2);
    const windowIn =
      status === 'scheduled'
        ? Math.max(0, departureTimeS - t)
        : timeToNextWindow(currentPhase, requiredPhase, n1, n2);
    liveRows = (
      <>
        <Row label="Synodic period" value={fmtDays(synodicPeriod(orbitalPeriod(mu, r1), orbitalPeriod(mu, r2)))} />
        <Row label="Required phase" value={fmtDeg(requiredPhase)} />
        <Row label="Current phase" value={fmtDeg(currentPhase)} dim={status !== 'idle'} />
        {(status === 'idle' || status === 'scheduled') && (
          <Row label="Next window in" value={fmtDays(windowIn)} />
        )}
      </>
    );
  }

  let transitRow: ReactNode = null;
  if (status === 'inTransit') {
    const remaining = Math.max(0, departureTimeS + result.transferTimeS - t);
    transitRow = (
      <Row
        label="Arrival in"
        value={helio ? fmtDays(remaining) : fmtHoursMinutes(remaining)}
      />
    );
  }

  return (
    <Card className="floating-panel" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb={6}>
        <Text size="xs" className="panel-title">
          Telemetry
        </Text>
        <Badge size="sm" variant="light" color={STATUS_COLOR[status]}>
          {STATUS_LABEL[status]}
        </Badge>
      </Group>
      <Stack gap={4}>
        <Row label="Δv₁ · departure burn" value={fmtKmPerS(result.dv1)} />
        <Row label="Δv₂ · arrival burn" value={fmtKmPerS(result.dv2)} />
        <Row label="Δv total" value={fmtKmPerS(result.dvTotal)} />
        <Row
          label="Transfer time"
          value={helio ? fmtDays(result.transferTimeS) : fmtHoursMinutes(result.transferTimeS)}
        />
        {liveRows}
        {transitRow}
        {!helio && (
          <>
            <Divider my={4} opacity={0.4} />
            <Row label="Start orbit radius" value={fmtKm(r1)} />
            <Row label="Target orbit radius" value={fmtKm(r2)} />
            <Row label="Start orbit speed" value={fmtKmPerS(circularVelocity(mu, r1))} />
            <Row label="Target orbit speed" value={fmtKmPerS(circularVelocity(mu, r2))} />
            <Row label="Start period" value={fmtHoursMinutes(orbitalPeriod(mu, r1))} />
            <Row label="Target period" value={fmtHoursMinutes(orbitalPeriod(mu, r2))} />
          </>
        )}
      </Stack>
    </Card>
  );
}

/** "1.00 × 5.20 AU ellipse" / "hyperbola — escapes" one-liner for a heliocentric conic. */
function describeOrbit(el: ConicElements): string {
  if (el.type === 'hyperbolic') {
    return `hyperbola — escapes at ${Math.sqrt(2 * el.energy).toFixed(1)} km/s`;
  }
  const peri = periapsisRadius(el) / AU_KM;
  const apo = (apoapsisRadius(el) ?? 0) / AU_KM;
  return `${peri.toFixed(2)} × ${apo.toFixed(2)} AU ellipse`;
}

function SlingshotResults() {
  const result = useFlybyResult();
  const gained = result.deltaSpeedKmS >= 0;
  return (
    <Card className="floating-panel" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb={6}>
        <Text size="xs" className="panel-title">
          Gravity assist
        </Text>
        <Badge size="sm" variant="light" color={result.escapesAfter ? 'grape' : gained ? 'orange' : 'ice'}>
          {result.escapesAfter ? 'Solar escape!' : gained ? 'Energy gained' : 'Energy lost'}
        </Badge>
      </Group>
      <Stack gap={4}>
        <Row label="Planet orbital speed" value={fmtKmPerS(result.vPlanetKmS)} />
        <Row label="v∞ (planet frame)" value={fmtKmPerS(Math.hypot(result.vInfInVec.x, result.vInfInVec.y))} />
        <Row label="Turn angle" value={fmtDeg(result.turnAngleRad)} />
        <Divider my={4} opacity={0.4} />
        <Row label="Sun-frame speed in" value={fmtKmPerS(result.speedInKmS)} />
        <Row label="Sun-frame speed out" value={fmtKmPerS(result.speedOutKmS)} />
        <Row
          label="Speed change — free"
          value={`${result.deltaSpeedKmS >= 0 ? '+' : ''}${result.deltaSpeedKmS.toFixed(3)} km/s`}
        />
        <Row label="Equivalent engine Δv" value={fmtKmPerS(result.equivalentDvKmS)} />
        <Divider my={4} opacity={0.4} />
        <Row label="Orbit before" value={describeOrbit(result.preOrbit)} />
        <Row label="Orbit after" value={describeOrbit(result.postOrbit)} />
      </Stack>
      <Text size="xs" c="dimmed" mt={8}>
        The "free" Δv is momentum borrowed from the planet — Jupiter slows down by about 10⁻²³ km/s.
      </Text>
    </Card>
  );
}

function OberthResults() {
  const body = useOberthBody();
  const result = useOberthResult();
  const multiplier = result.energyGainKm2S2 / result.energyGainAtApoapsis;
  return (
    <Card className="floating-panel" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb={6}>
        <Text size="xs" className="panel-title">
          Oberth effect
        </Text>
        <Badge size="sm" variant="light" color={result.escapes ? 'grape' : 'orange'}>
          {result.escapes ? `Escapes ${body.name}!` : 'Bound orbit'}
        </Badge>
      </Group>
      <Stack gap={4}>
        <Row label="Speed at burn point" value={fmtKmPerS(result.burnSpeedKmS)} />
        <Row label="Escape speed there" value={fmtKmPerS(result.escapeSpeedAtBurnKmS)} />
        <Row label="Burn radius" value={fmtKm(result.burnRadiusKm)} />
        <Divider my={4} opacity={0.4} />
        <Row label="Energy bought here" value={`${result.energyGainKm2S2.toFixed(2)} km²/s²`} />
        <Row label="… at periapsis" value={`${result.energyGainAtPeriapsis.toFixed(2)} km²/s²`} dim />
        <Row label="… at apoapsis" value={`${result.energyGainAtApoapsis.toFixed(2)} km²/s²`} dim />
        <Row label="Periapsis advantage" value={`${(result.energyGainAtPeriapsis / result.energyGainAtApoapsis).toFixed(1)}×`} />
        <Row label="This burn vs apoapsis" value={`${multiplier.toFixed(1)}×`} />
        <Divider my={4} opacity={0.4} />
        {result.escapes ? (
          <Row label="Hyperbolic excess v∞" value={fmtKmPerS(result.vInfinityKmS!)} />
        ) : (
          <Row label="New apoapsis altitude" value={fmtKm(result.newApoapsisKm! - body.radiusKm)} />
        )}
      </Stack>
      <Text size="xs" c="dimmed" mt={8}>
        Same propellant, same engine — the payoff depends entirely on where you light it.
      </Text>
    </Card>
  );
}

function MissionResults() {
  const missionId = useStore((s) => s.missionId);
  const mission = MISSIONS[missionId];
  const path = useMissionPath();
  const t = useSimTime();
  const tDays = Math.min(t / SECONDS_PER_DAY, path.totalDays);
  const ship = missionShipAt(path, tDays);
  const nextEvent = path.events.find((e) => e.tDays > tDays);
  const done = tDays >= path.totalDays;

  return (
    <Card className="floating-panel" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb={6}>
        <Text size="xs" className="panel-title">
          {mission.name}
        </Text>
        <Badge size="sm" variant="light" color={done ? 'teal' : 'orange'}>
          {done ? 'Map complete' : 'Cruising'}
        </Badge>
      </Group>
      <Stack gap={4}>
        <Row label="Mission date" value={missionDateAt(mission, tDays)} />
        <Row label="Elapsed" value={`${(tDays / 365.25).toFixed(1)} yr (${Math.round(tDays).toLocaleString('en-US')} d)`} />
        <Row label="Distance from Sun" value={`${ship.rAu.toFixed(2)} AU`} />
        {nextEvent && (
          <>
            <Divider my={4} opacity={0.4} />
            <Row label="Next event" value={nextEvent.label} />
            <Row label="In" value={fmtDays((nextEvent.tDays - tDays) * SECONDS_PER_DAY, 0)} />
          </>
        )}
      </Stack>
      <Text size="xs" c="dimmed" mt={8}>
        {mission.status}
      </Text>
    </Card>
  );
}

export function ResultsPanel() {
  const mode = useStore((s) => s.mode);
  switch (mode) {
    case 'slingshot':
      return <SlingshotResults />;
    case 'oberth':
      return <OberthResults />;
    case 'missions':
      return <MissionResults />;
    default:
      return <TransferResults />;
  }
}
