# Orbital Transfer Lab

Interactive space visualization for orbital mechanics — Hohmann transfers, gravity-assist slingshots, the Oberth effect, and replays of historic missions — built with React 19, TypeScript, Three.js (react-three-fiber), Mantine, and zustand.

## Run it

```sh
pnpm install
pnpm dev        # dev server
pnpm test       # physics unit tests (vitest)
pnpm build      # production build
```

## Modes

- **Interplanetary transfer** — planet-to-planet Hohmann transfers around the Sun. Pick departure and target planets, read Δv budgets, transfer time, synodic period, and the required departure phase angle. *Launch now* burns immediately; *Wait for next window* holds until the phase angle is right, then departs automatically and arrives at the target planet. Toggle the compressed (square-root) distance scale to fit the outer planets on screen.
- **Earth orbit transfer** — circular orbit-to-orbit transfers around Earth (e.g. LEO → GEO). Configure both altitudes (sliders, number inputs, or LEO/MEO/GEO presets) and execute the two-burn transfer; the scene is true-scale (1 unit = 1,000 km).
- **Gravity assist** — patched-conic slingshot builder. Choose the assist planet, hyperbolic excess speed v∞, flyby periapsis, and approach geometry; pass *behind* the planet to speed up or *ahead* to slow down. The scene shows the heliocentric orbit before (dashed) and after the flyby, and an inset diagrams the planet-frame hyperbola with its turn angle δ, where sin(δ/2) = 1/(1 + r_p·v∞²/μ). Readouts include the "free" Δv stolen from the planet's orbital motion and whether the craft escapes the solar system.
- **Oberth effect** — why burns are cheapest deep in a gravity well, around **any central body**: the Sun, any planet, or a major moon. Set up an elliptical orbit (sliders scale with the body), pick a burn size and *where* on the orbit to fire it, and compare the energy gained (ΔE = v·Δv + Δv²/2) at that point against the same burn at periapsis and apoapsis. Shows the new orbit, the raised apoapsis (or hyperbolic v∞ on escape), and the periapsis advantage factor.
- **Historic missions** — animated replays of eight real missions: Voyager 1, Voyager 2's grand tour, Galileo's VEEGA loop, Cassini–Huygens, New Horizons, MESSENGER's six-flyby crawl into Mercury orbit, Juno, and Parker Solar Probe's shrinking Venus-assist petals. Trajectories are stylized interpolations pinned to the real flyby dates, with planets placed from their J2000 mean longitudes so encounter geometry is roughly right. A timeline tracks each gravity assist and event as the clock passes it.

**Major moons**: the Galilean moons, Titan, Enceladus, the Moon, Titania, and Triton (retrograde) orbit their planets at their real periods — on exaggerated display orbits in the solar-system views, and at true scale in Earth-orbit mode, where the Moon sits a sobering 384,400 km out.

**Camera**: drag to orbit, scroll to zoom, and lock the focus onto any body — pick one in the time bar or click a planet's label; the camera then rides along as it moves. The left panel is drag-resizable and collapsible, the telemetry card can be minimized, and those layout preferences persist across sessions.

Time controls (bottom bar): play/pause, reset, and per-mode speed presets.

## Physics

Analytic two-body Kepler mechanics in pure TypeScript under `src/physics/` (no React/Three imports):

- vis-viva, circular velocities, periods, mean motions, Kepler-equation Newton solver (`kepler.ts`)
- Hohmann Δv₁/Δv₂, transfer time, transfer-ellipse geometry, synodic period, departure phase angle, launch-window timing (`hohmann.ts`)
- general 2D conics from state vectors via the eccentricity vector — ellipses and hyperbolae alike (`conic.ts`)
- patched-conic gravity assists: planet-frame velocity rotation by the hyperbolic turn angle, heliocentric orbits before/after (`flyby.ts`)
- Oberth-effect energy accounting for an impulsive prograde burn anywhere on an orbit (`oberth.ts`)
- The spacecraft moves along the transfer ellipse at physically correct non-uniform speed via a Newton solve of Kepler's equation.

All orbits are treated as circular and coplanar. Unit tests (52) pin the numbers to textbook values (LEO 300 km → GEO ≈ 3.89 km/s total; Earth → Mars ≈ 5.59 km/s, ≈ 259 d, 44.3° phase, ≈ 780 d synodic).

## Graphics

- Post-processing bloom + vignette (`@react-three/postprocessing`), toggleable in the panel
- Real NASA-derived maps for Earth (Blue Marble) and the Moon (`public/textures/`); procedural canvas textures for everything else — banded gas giants, rocky worlds and moons, Saturn's rings with the Cassini gap — all seeded and cached
- Layered additive glow sprites for the Sun and planet halos, atmosphere shell on Earth
- Spacecraft model with an engine glow and a fading motion trail
- Two parallax starfield layers

## Architecture

```
src/
  physics/   pure Kepler/Hohmann/conic/flyby/Oberth math + vitest suites (km, s, rad, km/s)
  data/      historic mission waypoints (real dates + J2000 planet longitudes)
  state/     zustand store (config, sim clock, transfer state machine) + memoized selectors
  scene/     react-three-fiber scenes; km -> scene-unit mapping lives only in scale.ts
  ui/        Mantine control panel, telemetry readout, time bar, flyby inset diagram
```

Rendering notes: scene coordinates stay O(1–100) (never raw km in float32 buffers); every path — transfer arcs, conics, mission trajectories — is point-sampled in physical space and mapped through the radial scale, so curves stay tangent to the orbit rings even under nonlinear compression; per-frame motion reads the clock transiently inside `useFrame` — React re-renders only on configuration changes.
