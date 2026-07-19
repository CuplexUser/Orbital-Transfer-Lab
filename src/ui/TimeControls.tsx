import { ActionIcon, Group, Paper, Select, Slider, Text, Tooltip } from '@mantine/core';
import { MISSIONS, missionTotalDays } from '../data/missions';
import { PLANETS, PLANET_LIST } from '../physics';
import { useSimTime } from '../state/selectors';
import { useStore, type Mode } from '../state/store';
import { fmtClock } from './fmt';

/** Camera focus targets for the current mode ('sun' = scene center). */
function focusOptions(mode: Mode, missionId: string): { value: string; label: string }[] {
  if (mode === 'geocentric') {
    return [
      { value: 'sun', label: 'Earth' },
      { value: 'moon', label: 'Moon' },
      { value: 'ship', label: 'Spacecraft' },
    ];
  }
  if (mode === 'missions') {
    const mission = MISSIONS[missionId as keyof typeof MISSIONS];
    return [
      { value: 'sun', label: 'Sun' },
      ...mission.showPlanets.map((id) => ({ value: id, label: PLANETS[id].name })),
      { value: 'ship', label: 'Spacecraft' },
    ];
  }
  return [
    { value: 'sun', label: 'Sun' },
    ...PLANET_LIST.map((p) => ({ value: p.id, label: p.name })),
    { value: 'ship', label: 'Spacecraft' },
  ];
}

const DAY = 86_400;

/**
 * Sim-seconds-per-real-second bounds for the speed slider, by mode. Missions
 * scale with the mission's own duration — Parker's petals need slow, fine
 * control while Voyager's decades need to be skimmable.
 */
function speedBoundsS(mode: Mode, missionId: string): [number, number] {
  if (mode === 'geocentric') return [10, 4 * 3600]; // 10 s/s .. 4 h/s
  if (mode === 'missions') {
    const mission = MISSIONS[missionId as keyof typeof MISSIONS];
    const totalDays = missionTotalDays(mission);
    return [(totalDays / 2000) * DAY, (totalDays / 4) * DAY];
  }
  return [0.1 * DAY, 120 * DAY];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Format a sim-seconds-per-real-second rate in the most legible unit. */
function fmtSpeed(v: number): string {
  if (v < 60) return `${round1(v)} s/s`;
  if (v < 3600) return `${round1(v / 60)} min/s`;
  if (v < DAY) return `${round1(v / 3600)} h/s`;
  if (v < DAY * 365) return `${round1(v / DAY)} d/s`;
  return `${round1(v / (DAY * 365))} yr/s`;
}

export function TimeControls() {
  const mode = useStore((s) => s.mode);
  const playing = useStore((s) => s.playing);
  const timeScale = useStore((s) => s.timeScale);
  const setPlaying = useStore((s) => s.setPlaying);
  const setTimeScale = useStore((s) => s.setTimeScale);
  const resetSim = useStore((s) => s.resetSim);
  const focusId = useStore((s) => s.focusId);
  const setFocus = useStore((s) => s.setFocus);
  const missionId = useStore((s) => s.missionId);
  const t = useSimTime();

  const [minS, maxS] = speedBoundsS(mode, missionId);
  const logMin = Math.log10(minS);
  const logMax = Math.log10(maxS);
  const logValue = Math.min(logMax, Math.max(logMin, Math.log10(timeScale)));

  return (
    <Paper className="floating-panel time-bar" p="xs" radius="md" withBorder>
      <Group gap="sm" wrap="nowrap">
        <Tooltip label={playing ? 'Pause' : 'Play'}>
          <ActionIcon
            variant="light"
            size="lg"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? 'Pause simulation' : 'Play simulation'}
          >
            {playing ? '⏸' : '▶'}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Reset clock">
          <ActionIcon
            variant="subtle"
            size="lg"
            color="gray"
            onClick={resetSim}
            aria-label="Reset simulation clock"
          >
            ↺
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Simulation speed">
          <Slider
            size="xs"
            w={130}
            min={logMin}
            max={logMax}
            step={(logMax - logMin) / 200}
            value={logValue}
            onChange={(v) => setTimeScale(10 ** v)}
            label={(v) => fmtSpeed(10 ** v)}
            aria-label="Simulation speed"
          />
        </Tooltip>
        <Text size="xs" className="telemetry-value" style={{ minWidth: 60 }}>
          {fmtSpeed(timeScale)}
        </Text>
        <Tooltip label="Lock the camera onto a body">
          <Select
            size="xs"
            w={128}
            aria-label="Camera focus"
            leftSection={<span aria-hidden>◎</span>}
            data={focusOptions(mode, missionId)}
            value={focusId}
            onChange={(v) => v && setFocus(v)}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />
        </Tooltip>
        <Text size="sm" className="telemetry-value" style={{ minWidth: 96, textAlign: 'right' }}>
          {fmtClock(t, mode)}
        </Text>
      </Group>
    </Paper>
  );
}
