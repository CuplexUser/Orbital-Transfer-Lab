import { Button, Popover, SegmentedControl, Stack, Switch, Text } from '@mantine/core';
import { supportsCompression } from '../scene/scale';
import { useStore, type BodySizeMode } from '../state/store';

const BODY_SIZE_DATA: { label: string; value: BodySizeMode }[] = [
  { label: 'Readable', value: 'readable' },
  { label: 'Proportional', value: 'proportional' },
  { label: 'True', value: 'true' },
];

const BODY_SIZE_HINT: Record<BodySizeMode, string> = {
  readable: 'Enlarged and range-compressed so Mercury stays visible next to Jupiter.',
  proportional: 'One multiplier for every body — Jupiter really is 11× Earth.',
  true: 'Bodies drawn on the distance scale. They nearly vanish: that is the real ratio.',
};

const DISTANCE_HINT: Record<'true' | 'compressed', string> = {
  true: 'Radii exactly to scale. The outer solar system runs far off screen.',
  compressed: 'Square-root radial scale: near orbits keep their size, far ones fold in.',
};

/**
 * Display preferences live in a popover rather than the panel body — they are
 * set once and then in the way, and the always-visible chrome is what eats the
 * screen this app is mostly made of.
 */
export function DisplaySettings() {
  const mode = useStore((s) => s.mode);
  const compressedScale = useStore((s) => s.compressedScale);
  const setCompressedScale = useStore((s) => s.setCompressedScale);
  const bodySizeMode = useStore((s) => s.bodySizeMode);
  const setBodySizeMode = useStore((s) => s.setBodySizeMode);
  const effectsEnabled = useStore((s) => s.effectsEnabled);
  const setEffectsEnabled = useStore((s) => s.setEffectsEnabled);

  const canCompress = supportsCompression(mode);
  const distanceValue = compressedScale && canCompress ? 'compressed' : 'true';

  return (
    <Popover width={290} position="top-start" withArrow shadow="md">
      <Popover.Target>
        <Button size="compact-xs" variant="default" fullWidth>
          ⚙ Display & scale
        </Button>
      </Popover.Target>
      <Popover.Dropdown className="floating-panel">
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Distance scale
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            disabled={!canCompress}
            value={distanceValue}
            onChange={(v) => setCompressedScale(v === 'compressed')}
            data={[
              { label: 'True', value: 'true' },
              { label: 'Compressed √', value: 'compressed' },
            ]}
          />
          <Text size="xs" c="dimmed">
            {canCompress
              ? DISTANCE_HINT[distanceValue]
              : 'The Oberth lab normalizes its central body, so compression does not apply.'}
          </Text>

          <Text size="xs" c="dimmed" mt="xs">
            Body sizes
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            value={bodySizeMode}
            onChange={(v) => setBodySizeMode(v as BodySizeMode)}
            data={BODY_SIZE_DATA}
          />
          <Text size="xs" c="dimmed">
            {BODY_SIZE_HINT[bodySizeMode]}
          </Text>

          <Switch
            label="Bloom & glow effects"
            size="xs"
            checked={effectsEnabled}
            onChange={(e) => setEffectsEnabled(e.currentTarget.checked)}
            mt="xs"
          />
          <Text size="xs" c="dimmed" mt={4}>
            Drag to orbit the camera, scroll to zoom. Click a body's label to focus on it.
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
