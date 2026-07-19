import { Select, Stack, Text, Timeline } from '@mantine/core';
import { MISSIONS, MISSION_LIST, type MissionId } from '../data/missions';
import { SECONDS_PER_DAY } from '../physics';
import { useMissionPath, useSimTime } from '../state/selectors';
import { useStore } from '../state/store';

export function MissionControls() {
  const missionId = useStore((s) => s.missionId);
  const setMissionId = useStore((s) => s.setMissionId);
  const mission = MISSIONS[missionId];
  const path = useMissionPath();
  const simDays = useSimTime() / SECONDS_PER_DAY;

  const passedCount = path.events.filter((e) => simDays >= e.tDays).length;

  return (
    <Stack gap="sm">
      <Select
        label="Mission"
        data={MISSION_LIST.map((m) => ({ value: m.id, label: m.name }))}
        value={missionId}
        onChange={(v) => v && setMissionId(v as MissionId)}
        allowDeselect={false}
      />
      <Text size="xs" c="dimmed">
        {mission.blurb}
      </Text>
      <Timeline active={passedCount - 1} bulletSize={14} lineWidth={2} color="orange">
        {path.events.map((e) => (
          <Timeline.Item
            key={e.label}
            title={
              <Text size="sm" fw={500}>
                {e.label}
              </Text>
            }
          >
            <Text size="xs" className="telemetry-value">
              {e.dateISO}
            </Text>
            {e.note && (
              <Text size="xs" c="dimmed">
                {e.note}
              </Text>
            )}
          </Timeline.Item>
        ))}
      </Timeline>
      <Text size="xs" c="dimmed" fs="italic">
        Dates and flyby sequences are real; drawn geometry is illustrative (circular coplanar
        orbits, smoothed legs).
      </Text>
    </Stack>
  );
}
