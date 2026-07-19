import { ActionIcon, Group, Paper, Select, SegmentedControl, Text, Tooltip } from '@mantine/core';
import { MISSIONS, missionSpeedPresetsDPerS, missionTotalDays } from '../data/missions';
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

const HELIO_SPEEDS = [
  { label: '1 d/s', value: String(86_400) },
  { label: '5 d/s', value: String(5 * 86_400) },
  { label: '15 d/s', value: String(15 * 86_400) },
  { label: '60 d/s', value: String(60 * 86_400) },
];

const GEO_SPEEDS = [
  { label: '1 min/s', value: String(60) },
  { label: '10 min/s', value: String(600) },
  { label: '30 min/s', value: String(1800) },
  { label: '2 h/s', value: String(7200) },
];

const fmtDPerS = (d: number) =>
  d >= 365 ? `${Number((d / 365).toFixed(1))} yr/s` : `${d} d/s`;

/** Mission speeds scale with mission length: Parker's petals need d/s, Voyager needs yr/s. */
function missionSpeeds(missionId: string): { label: string; value: string }[] {
  const mission = MISSIONS[missionId as keyof typeof MISSIONS];
  return missionSpeedPresetsDPerS(missionTotalDays(mission)).map((d) => ({
    label: fmtDPerS(d),
    value: String(d * 86_400),
  }));
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

  const speeds =
    mode === 'missions' ? missionSpeeds(missionId) : mode === 'geocentric' ? GEO_SPEEDS : HELIO_SPEEDS;

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
        <SegmentedControl
          size="xs"
          data={speeds}
          value={String(timeScale)}
          onChange={(v) => setTimeScale(Number(v))}
        />
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
