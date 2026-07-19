import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'ice',
  primaryShade: 5,
  defaultRadius: 'md',
  fontFamily:
    "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontFamilyMonospace:
    "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
  headings: {
    fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    fontWeight: '600',
  },
  colors: {
    ice: [
      '#e4f4ff',
      '#cfe6fb',
      '#a2cbf2',
      '#71afe9',
      '#4a97e2',
      '#3389de',
      '#2481dc',
      '#146fc4',
      '#0362b1',
      '#00549d',
    ],
    // Deep-space indigo replacing Mantine's neutral dark grays.
    dark: [
      '#c9d3ec',
      '#a4b0cf',
      '#7e8ab0',
      '#5a6690',
      '#3c4770',
      '#2a3355',
      '#1c2340',
      '#131830',
      '#0c1022',
      '#060814',
    ],
  },
});

/** Instrument-panel amber used for telemetry values, matching the 3D scene. */
export const TELEMETRY_AMBER = '#ffc069';
