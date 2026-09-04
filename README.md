# Shear & Sway — Interactive 3D Earthquake-Building Simulator

A self-contained Three.js app that lets you shake a parametric building with an
adjustable earthquake, watch a physically-modeled structural response in real
time, and inspect a post-quake damage report.

## Files

```
earthquake-sim/
├── index.html     UI shell: viewport, control dock, readout, damage report drawer
├── style.css       Instrument-panel visual design
├── physics.js      Lumped-mass shear-building structural model + integrator
├── quake.js        Ground-motion generator (sine / Ricker / filtered noise)
├── building.js      Three.js building mesh, deformation, cracks, collapse
└── script.js        Scene setup, animation loop, all UI wiring
```

Load order matters: `physics.js` → `quake.js` → `building.js` → `script.js`
(already set up correctly in `index.html`).

## Running it

This is a plain static site — no build step, no `npm install`.

**In VS Code:**
1. Open this folder in VS Code (`File → Open Folder…`).
2. Install the **Live Server** extension (if you don't have it).
3. Right-click `index.html` → **Open with Live Server**.

**Or from any terminal**, from inside this folder:
```bash
python3 -m http.server 8000
```
then open `http://localhost:8000` in a browser.

(Opening `index.html` directly via `file://` also works in most browsers,
since everything is loaded through classic `<script>` tags and CDN URLs
rather than ES module imports — Live Server is just nicer for auto-reload.)

## What's implemented

- **Scene & camera** — OrbitControls (drag to orbit, scroll to zoom, right-drag
  to pan), a shadow-casting sun light + ambient fill, a gridded ground plane,
  Front/Side/Plan/Free camera presets, and a Reset Camera button.
- **Building model** — floor slabs connected by per-story corner columns (plus
  mid-span columns on wide buildings) that individually skew as they bend,
  driven by a lumped-mass shear-building physics model (`physics.js`):
  stiffness/mass scale with footprint width, damping comes from the damping
  ratio slider, and the first-mode natural frequency is computed from the
  closed-form eigenvalue of a uniform N-mass shear chain.
- **Earthquake model** — Sine, Ricker wavelet, and filtered-noise (biquad
  bandpass over white noise) ground acceleration, integrated to velocity and
  displacement so the ground plane itself visibly shakes.
- **Damage & collapse** — inter-story drift ratio is tracked per floor every
  step; crossing thresholds adds crack decals and tints columns
  yellow → orange → red, and a story exceeding the collapse threshold
  triggers a procedural tumble-and-dust-burst collapse animation.
- **Live readouts** — roof displacement, peak drift (+ which floor), a
  Safe/Warning/Severe/Collapsed badge, a resonance-proximity gauge (natural
  frequency vs. quake frequency), and a scrolling seismograph strip chart.
- **Damage report** — after the shake, a side drawer shows a color-coded
  building elevation, a per-story drift table, an overall verdict, and (on
  collapse) which story initiated the failure. Clicking a story zooms the
  camera to it. "Replay Shake" re-runs the exact same ground motion.
- **Extras** — four presets (Small tremor / Great quake / Skyscraper /
  Low-rise), a collapsible plain-language resonance explainer, and a
  frequency-response sweep that plots peak sway vs. quake frequency to make
  the resonance peak visible as a curve.

## Notes on the physics

Natural frequency, damage thresholds, and the stiffness/mass scaling formulas
are simplified, educational approximations (explicitly not a code-compliant
structural calculation) — deliberately so, per the original brief, to keep
resonance behavior emergent from a real mass-spring-damper chain rather than
scripted.
