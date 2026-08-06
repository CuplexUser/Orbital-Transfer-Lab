import { Button, Select, Stack, Text } from '@mantine/core';
import { PLANET_LIST } from '../physics';
import { useStore } from '../state/store';
import type { PlanetId } from '../physics';

export function HeliocentricControls() {
  const departurePlanet = useStore((s) => s.departurePlanet);
  const targetPlanet = useStore((s) => s.targetPlanet);
  const status = useStore((s) => s.transfer.status);
  const setDeparturePlanet = useStore((s) => s.setDeparturePlanet);
  const setTargetPlanet = useStore((s) => s.setTargetPlanet);
  const launchNow = useStore((s) => s.launchNow);
  const scheduleNextWindow = useStore((s) => s.scheduleNextWindow);
  const resetTransfer = useStore((s) => s.resetTransfer);

  const planetData = (excludeId: PlanetId) =>
    PLANET_LIST.map((p) => ({ value: p.id, label: p.name, disabled: p.id === excludeId }));

  const transferActive = status !== 'idle';

  return (
    <Stack gap="sm">
      <Select
        label="Departure planet"
        data={planetData(targetPlanet)}
        value={departurePlanet}
        onChange={(v) => v && setDeparturePlanet(v as PlanetId)}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
      <Select
        label="Target planet"
        data={planetData(departurePlanet)}
        value={targetPlanet}
        onChange={(v) => v && setTargetPlanet(v as PlanetId)}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
      <Button onClick={launchNow} disabled={transferActive} variant="filled">
        Launch now
      </Button>
      <Button onClick={scheduleNextWindow} disabled={transferActive} variant="light">
        Wait for next window
      </Button>
      {transferActive && (
        <Button onClick={resetTransfer} variant="subtle" color="gray">
          Reset transfer
        </Button>
      )}
      <Text size="xs" c="dimmed">
        "Launch now" burns immediately from the departure planet's current position. "Wait for next
        window" holds until the phase angle is right, then departs automatically.
      </Text>
    </Stack>
  );
}
