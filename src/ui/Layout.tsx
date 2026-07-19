import {
  ActionIcon,
  AppShell,
  Burger,
  Button,
  Divider,
  Group,
  ScrollArea,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useRef } from 'react';
import { SpaceCanvas } from '../scene/SpaceCanvas';
import { useStore, type Mode } from '../state/store';
import { GeocentricControls } from './GeocentricControls';
import { HeliocentricControls } from './HeliocentricControls';
import { MissionControls } from './MissionControls';
import { OberthControls } from './OberthControls';
import { ResultsPanel } from './ResultsPanel';
import { SlingshotControls } from './SlingshotControls';
import { TimeControls } from './TimeControls';

const MODE_DATA: { label: string; value: Mode }[] = [
  { label: 'Interplanetary transfer', value: 'heliocentric' },
  { label: 'Earth orbit transfer', value: 'geocentric' },
  { label: 'Gravity assist', value: 'slingshot' },
  { label: 'Oberth effect', value: 'oberth' },
  { label: 'Historic missions', value: 'missions' },
];

const MODE_CONTROLS: Record<Mode, () => React.ReactElement> = {
  heliocentric: HeliocentricControls,
  geocentric: GeocentricControls,
  slingshot: SlingshotControls,
  oberth: OberthControls,
  missions: MissionControls,
};

/** Modes where the sim clock matters and the time bar should show. */
const TIMED_MODES: Mode[] = ['heliocentric', 'geocentric', 'missions'];

const NAVBAR_MIN = 280;
const NAVBAR_MAX = 480;

/** Drag handle on the panel's right edge. */
function ResizeHandle() {
  const setNavbarWidth = useStore((s) => s.setNavbarWidth);
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      setNavbarWidth(Math.min(NAVBAR_MAX, Math.max(NAVBAR_MIN, e.clientX)));
    },
    [setNavbarWidth],
  );
  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      className="nav-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize control panel"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => setNavbarWidth(340)}
    />
  );
}

export function Layout() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const effectsEnabled = useStore((s) => s.effectsEnabled);
  const setEffectsEnabled = useStore((s) => s.setEffectsEnabled);
  const navbarWidth = useStore((s) => s.navbarWidth);
  const navbarCollapsed = useStore((s) => s.navbarCollapsed);
  const setNavbarCollapsed = useStore((s) => s.setNavbarCollapsed);
  const telemetryCollapsed = useStore((s) => s.telemetryCollapsed);
  const setTelemetryCollapsed = useStore((s) => s.setTelemetryCollapsed);
  const [opened, { toggle }] = useDisclosure();
  const Controls = MODE_CONTROLS[mode];

  return (
    <AppShell
      padding={0}
      navbar={{
        width: navbarWidth,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: navbarCollapsed },
      }}
    >
      <AppShell.Navbar p="md" className="control-panel">
        <AppShell.Section>
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <div>
              <Text className="app-title">Orbital Transfer Lab</Text>
              <Text size="xs" c="dimmed" mb="md">
                Transfers · slingshots · the Oberth effect · historic missions
              </Text>
            </div>
            <Tooltip label="Hide panel">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                visibleFrom="sm"
                onClick={() => setNavbarCollapsed(true)}
                aria-label="Hide control panel"
              >
                ⟨
              </ActionIcon>
            </Tooltip>
          </Group>
          <SegmentedControl
            fullWidth
            orientation="vertical"
            size="xs"
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            data={MODE_DATA}
            mb="md"
          />
        </AppShell.Section>
        <Divider mb="md" opacity={0.4} />
        <AppShell.Section grow component={ScrollArea}>
          <Controls />
        </AppShell.Section>
        <AppShell.Section>
          <Divider my="sm" opacity={0.4} />
          <Switch
            label="Bloom & glow effects"
            size="xs"
            checked={effectsEnabled}
            onChange={(e) => setEffectsEnabled(e.currentTarget.checked)}
            mb={6}
          />
          <Text size="xs" c="dimmed">
            Two-body Kepler mechanics, circular coplanar orbits. Drag to orbit the camera, scroll
            to zoom. Click a planet's label to focus the camera on it.
          </Text>
        </AppShell.Section>
        <ResizeHandle />
      </AppShell.Navbar>

      <AppShell.Main className="main-stage">
        <SpaceCanvas />
        <Burger
          className="mobile-burger"
          opened={opened}
          onClick={toggle}
          hiddenFrom="sm"
          size="sm"
          aria-label="Toggle controls"
        />
        {navbarCollapsed && (
          <Tooltip label="Show control panel" position="right">
            <ActionIcon
              className="navbar-reopen"
              variant="light"
              size="lg"
              visibleFrom="sm"
              onClick={() => setNavbarCollapsed(false)}
              aria-label="Show control panel"
            >
              ☰
            </ActionIcon>
          </Tooltip>
        )}
        <Stack className="results-slot" gap={6}>
          {telemetryCollapsed ? (
            <Group justify="flex-end">
              <Button
                size="compact-xs"
                variant="light"
                onClick={() => setTelemetryCollapsed(false)}
              >
                ▤ Telemetry
              </Button>
            </Group>
          ) : (
            <>
              <Group justify="flex-end" gap={4}>
                <Tooltip label="Minimize telemetry">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={() => setTelemetryCollapsed(true)}
                    aria-label="Minimize telemetry panel"
                  >
                    —
                  </ActionIcon>
                </Tooltip>
              </Group>
              <ResultsPanel />
            </>
          )}
        </Stack>
        {TIMED_MODES.includes(mode) && (
          <div className="time-slot">
            <TimeControls />
          </div>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
