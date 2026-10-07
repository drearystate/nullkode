# Racing (top-down 2D and 3D arcade) — phaser-2d (gravity 0) or three-3d
**Loop:** countdown → race laps through checkpoints → overtake AI / beat the ghost → result + best lap.
**Verbs:** accelerate, brake/reverse, steer, drift (optional), boost (optional).

**Tuning, 2D top-down** (game px; car sprite ~70×130):
- Max speed 520–800 px/s; 0→max in 2–3 s; brake 2× accel; reverse 30% max; coast drag 0.5%/step.
- Steering 2.5–3.5 rad/s × min(1, speed/200) (no turning in place).
- Grip: each step remove 85–92% of the sideways velocity (lower = drift); drift on brake+steer above 70% speed.
- Off-track (sample the tile/zone under the car): max speed 50%, dust particles.
- Walls: bounce 30% speed, never stop dead; no damage early.

**Tuning, 3D arcade** (kit has no vehicle controller: drive a `kinematic` body yourself, raycast down 2 u for ground height/normal):
- Kenney car kits are ~1 u = 1 m: speed 18–30 u/s, 0→max 3 s, yaw rate 1.6–2.4 rad/s at mid speed.
- Chase camera: `camera:{mode:"third-person", distance:6–8, pitch:0.25–0.35, lookAtHeight:1}`; config `fov` 60–70; widen +5° when boosting.

**Tracks:**
- Lap 30–60 s, 3 laps. Track width ≥ 3 car widths (2D) / 4 car widths (3D).
- Corners signposted (arrows/chevrons) 1.5 s ahead; first corner gentle; hairpins only after a long straight.
- Ordered checkpoints (sensors) every 15–25% of the lap; a lap counts only with all in order (no shortcut cheese). Respawn at the last checkpoint after 3 s stuck or off-map.
- Start grid on a straight; AI on spline waypoints with ±10% rubber-band and lane offsets.

**Progression/win-lose:** position 1–3 = gold/silver/bronze; time trial: ghost of the best lap (`NK.save` positions every 0.1 s). Next track unlocks on podium.

**Mobile:** `touch: { stick: "arrows", buttons: [{action:"gas"}, {action:"brake"}] }` + `NK.input.bind("gas", ["ArrowUp","KeyW","pad:7"])`, `bind("brake", ["ArrowDown","KeyS","pad:6"])`; pedal icons from `kenney/mobile-controls` (icon-pedal, icon-pedal-brake). Or auto-accelerate with steer + brake only. Never require tilt.

**Juice:** 3-2-1-GO beeps; engine loop pitch = 0.8 + speed ratio × 0.8; skid marks + tire squeal on drift; boost flames + FOV kick; checkpoint chime; lap time splits green/red with +/− signs; finish confetti.

**Mistakes:** no countdown; car that turns in place; walls that stop dead; laps counted by crossing the line backwards; invisible track edges; AI that ignores the player or teleports; camera too close at speed.

**Assets:** 2D `kenney/racing-pack`, `kenney/pixel-vehicle-pack`, `kenney/road-textures`, `kenney/racing-kit`; 3D `kenney/racing-kit-early-access`, `kenney/car-kit`, `kenney/toy-car-kit`, `kenney/city-kit-roads`; sound `kenney/digital-audio`, `kenney/impact-sounds`.
