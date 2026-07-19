# 🛰️ Orbital Transfer Lab

**Interactive orbital mechanics you can actually fly** — Hohmann transfers, gravity-assist slingshots, the Oberth effect, and replays of eight real missions, rendered in 3D and driven by real Kepler physics underneath, not canned animation.

[![Live Demo](https://badgen.net/badge/demo/live/4a90e2)](https://cuplexuser.github.io/Orbital-Transfer-Lab/)
[![TypeScript](https://badgen.net/badge/TypeScript/React%2019%20%C2%B7%20Three.js/3178c6)]()
[![Tests](https://badgen.net/badge/physics%20tests/52%20passing/2ea44f)]()

<!-- Add a screenshot or short GIF here — this is the single highest-impact change you can make.
     Suggested: docs/screenshot.png, then: ![Orbital Transfer Lab](docs/screenshot.png) -->

**[→ Try it live](https://cuplexuser.github.io/Orbital-Transfer-Lab/)** — runs entirely in-browser, nothing to install.

## What it does

Pick two planets, launch a transfer, and watch the actual Δv budget, transfer time, and phase angle play out — a real two-body Kepler solve runs underneath every animation. Four modes:

- **Interplanetary transfer** — planet-to-planet Hohmann transfers around the Sun, with launch-window timing (*launch now* or *wait for next window*)
- **Earth orbit transfer** — true-scale LEO ↔ GEO burns (1 unit = 1,000 km)
- **Gravity assist** — build a patched-conic slingshot and see the "free" Δv it steals from a planet's orbital motion
- **Oberth effect** — why burns are cheapest deep in a gravity well, visualized around any body from the Sun to a moon
- **Historic missions** — animated replays of Voyager 1 & 2, Galileo, Cassini–Huygens, New Horizons, MESSENGER, Juno, and Parker Solar Probe, pinned to real flyby dates with J2000 planet positions

**Major moons** (Galilean moons, Titan, Enceladus, the Moon, Titania, Triton) orbit at their real periods. **Camera** drags to orbit, scrolls to zoom, and can lock onto any body as it moves.

## Run it locally

```sh
pnpm install
pnpm dev        # dev server
pnpm test       # 52 physics unit tests (vitest)
pnpm build      # production build
```

<details>
<summary><b>The physics</b> — analytic two-body Kepler mechanics, pure TypeScript</summary>

All in `src/physics/`, no React/Three imports:

- vis-viva, circular velocities, periods, mean motions, Kepler-equation Newton solver (`kepler.ts`)
- Hohmann Δv₁/Δv₂, transfer time, transfer-ellipse geometry, synodic period, departure phase angle, launch-window timing (`hohmann.ts`)
- general 2D conics from state vectors via the eccentricity vector — ellipses and hyperbolae alike (`conic.ts`)
- patched-conic gravity assists: planet-frame velocity rotation by the hyperbolic turn angle (`flyby.ts`)
- Oberth-effect energy accounting for an impulsive prograde burn anywhere on an orbit (`oberth.ts`)
- the spacecraft moves along the transfer ellipse at physically correct non-uniform speed via a Newton solve of Kepler's equation

All orbits are treated as circular and coplanar. 52 unit tests pin the numbers to textbook values (LEO 300 km → GEO ≈ 3.89 km/s total; Earth → Mars ≈ 5.59 km/s, ≈ 259 d, 44.3° phase, ≈ 780 d synodic).

</details>

<details>
<summary><b>Graphics</b></summary>

- Post-processing bloom + vignette (`@react-three/postprocessing`), toggleable
- Real NASA-derived maps for Earth (Blue Marble) and the Moon; seeded procedural textures for everything else — banded gas giants, rocky worlds, Saturn's rings with the Cassini gap
- Layered additive glow sprites for the Sun and planet halos, atmosphere shell on Earth
- Spacecraft model with engine glow and a fading motion trail
- Two parallax starfield layers

</details>

<details>
<summary><b>Architecture</b></summary>

```
src/
  physics/   pure Kepler/Hohmann/conic/flyby/Oberth math + vitest suites (km, s, rad, km/s)
  data/      historic mission waypoints (real dates + J2000 planet longitudes)
  state/     zustand store (config, sim clock, transfer state machine) + memoized selectors
  scene/     react-three-fiber scenes; km -> scene-unit mapping lives only in scale.ts
  ui/        Mantine control panel, telemetry readout, time bar, flyby inset diagram
```

Scene coordinates stay O(1–100) — never raw km in float32 buffers. Every path (transfer arcs, conics, mission trajectories) is point-sampled in physical space and mapped through the radial scale, so curves stay tangent to orbit rings even under nonlinear compression. Per-frame motion reads the clock transiently inside `useFrame` — React re-renders only on configuration changes.

</details>
