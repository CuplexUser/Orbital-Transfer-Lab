import { CanvasTexture, SRGBColorSpace } from 'three';
import type { MoonId, PlanetId } from '../physics';

/**
 * Procedural canvas textures — no external assets, everything generated once
 * and cached. Deliberately painterly rather than photoreal: banded giants,
 * speckled rocky worlds, a stylized Earth.
 */

const cache = new Map<string, CanvasTexture>();

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Deterministic PRNG so textures are stable between mounts. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft radial gradient sprite for glows (sun, engine, atmospheres). */
export function glowTexture(color: string, inner = 0.0): CanvasTexture {
  const key = `glow:${color}:${inner}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { canvas, ctx } = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 256 * inner, 128, 128, 128);
  g.addColorStop(0, color);
  g.addColorStop(0.25, `${color}b0`);
  g.addColorStop(0.55, `${color}38`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = toTexture(canvas);
  cache.set(key, tex);
  return tex;
}

function bandedTexture(key: string, seed: number, palette: string[]): CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  const rand = mulberry32(seed);
  // Base vertical gradient of bands with wavy edges.
  const bands = 10 + Math.floor(rand() * 6);
  for (let b = 0; b < bands; b++) {
    const y0 = (H / bands) * b;
    const h = H / bands + 2;
    ctx.fillStyle = palette[b % palette.length];
    ctx.fillRect(0, y0, W, h);
  }
  // Wavy distortion: redraw thin sinusoidal strips sampling neighbors.
  const src = ctx.getImageData(0, 0, W, H);
  const out = ctx.createImageData(W, H);
  const amp = 5 + rand() * 7;
  const freq = 2 + rand() * 3;
  const phase = rand() * Math.PI * 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const shift = Math.round(
        amp * Math.sin((x / W) * Math.PI * 2 * freq + phase + y * 0.02) +
          amp * 0.5 * Math.sin((x / W) * Math.PI * 2 * (freq * 2.7) + y * 0.05),
      );
      const sy = Math.min(H - 1, Math.max(0, y + shift));
      const si = (sy * W + x) * 4;
      const di = (y * W + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  // Fine noise for texture.
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.05})`;
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1);
  }
  const tex = toTexture(canvas);
  cache.set(key, tex);
  return tex;
}

function rockyTexture(key: string, seed: number, base: string, shade: string, accent: string): CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  const rand = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // Large soft blotches.
  for (let i = 0; i < 90; i++) {
    const r = 8 + rand() * 46;
    const x = rand() * W;
    const y = rand() * H;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rand() < 0.55 ? shade : accent;
    g.addColorStop(0, `${c}55`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Craters/speckle.
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = rand() < 0.5 ? `rgba(0,0,0,${rand() * 0.14})` : `rgba(255,255,255,${rand() * 0.08})`;
    const s = rand() * 2.2;
    ctx.fillRect(rand() * W, rand() * H, s, s);
  }
  const tex = toTexture(canvas);
  cache.set(key, tex);
  return tex;
}

function earthTexture(): CanvasTexture {
  const key = 'earth';
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 1024;
  const H = 512;
  const { canvas, ctx } = makeCanvas(W, H);
  const rand = mulberry32(1969);
  // Ocean with subtle depth variation.
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, '#0e3a70');
  ocean.addColorStop(0.5, '#155a96');
  ocean.addColorStop(1, '#0e3a70');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);
  // Continent blobs: clustered random walks.
  for (let c = 0; c < 9; c++) {
    let x = rand() * W;
    let y = H * (0.18 + rand() * 0.64);
    const hue = 88 + rand() * 40;
    for (let i = 0; i < 220; i++) {
      const r = 4 + rand() * 16;
      ctx.fillStyle = `hsla(${hue}, ${34 + rand() * 22}%, ${26 + rand() * 14}%, 0.85)`;
      ctx.beginPath();
      ctx.ellipse((x + W) % W, y, r * 1.6, r, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      x += (rand() - 0.5) * 34;
      y += (rand() - 0.5) * 22;
      y = Math.min(H * 0.86, Math.max(H * 0.14, y));
    }
  }
  // Polar caps.
  ctx.fillStyle = 'rgba(235,244,252,0.92)';
  ctx.fillRect(0, 0, W, H * 0.05);
  ctx.fillRect(0, H * 0.95, W, H * 0.05);
  // Clouds: soft white streaks.
  for (let i = 0; i < 260; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const w = 20 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, w);
    g.addColorStop(0, `rgba(255,255,255,${0.10 + rand() * 0.16})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 2.2, w * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = toTexture(canvas);
  cache.set(key, tex);
  return tex;
}

export function planetTexture(id: PlanetId): CanvasTexture {
  switch (id) {
    case 'earth':
      return earthTexture();
    case 'jupiter':
      return bandedTexture('jupiter', 7, ['#c9a074', '#e3c9a5', '#a9744f', '#e8d5b7', '#b98a63', '#dbb287', '#8f5f43']);
    case 'saturn':
      return bandedTexture('saturn', 42, ['#e6cf9d', '#d9bd85', '#efe0b8', '#cbb078', '#e2ca94']);
    case 'uranus':
      return bandedTexture('uranus', 86, ['#9fd8db', '#b3e2e4', '#8fcdd1', '#a8dcde']);
    case 'neptune':
      return bandedTexture('neptune', 46, ['#4f6fd8', '#5f82e2', '#4363c4', '#6b8ce8']);
    case 'mercury':
      return rockyTexture('mercury', 3, '#8f8a86', '#5c5854', '#b5aca4');
    case 'venus':
      return bandedTexture('venus', 12, ['#e8c88f', '#f0d9a8', '#dbb377', '#eccf9a']);
    case 'mars':
      return rockyTexture('mars', 4, '#c2603c', '#7e3a24', '#e0885c');
  }
}

/** Procedural maps for moons rendered close-up (Oberth central body). */
export function moonSurfaceTexture(id: MoonId): CanvasTexture {
  switch (id) {
    case 'moon':
      return rockyTexture('moon', 11, '#b8b4ac', '#6e6a64', '#dcd8d0');
    case 'io':
      return rockyTexture('io', 21, '#e0c25a', '#b0722a', '#f2ecc0');
    case 'europa':
      return rockyTexture('europa', 22, '#d8cab6', '#a67b5c', '#efe9dd');
    case 'ganymede':
      return rockyTexture('ganymede', 23, '#a99c8d', '#6c6154', '#cfc4b4');
    case 'callisto':
      return rockyTexture('callisto', 24, '#8b8178', '#54493f', '#b8ae9f');
    case 'enceladus':
      return rockyTexture('enceladus', 25, '#eef3f6', '#b9cdd8', '#ffffff');
    case 'titan':
      return bandedTexture('titan', 26, ['#d8a24f', '#e5b869', '#c98f3c', '#efcd8a']);
    case 'titania':
      return rockyTexture('titania', 27, '#b7c4c9', '#7e8d93', '#dbe4e7');
    case 'triton':
      return rockyTexture('triton', 28, '#d4c2cf', '#96828f', '#efe4ec');
  }
}
