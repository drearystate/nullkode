# 3D first-person (simple) — three-3d
Good fits: maze/escape room, exploration, shooting gallery, simple arena shooter. Not a full FPS.
**Loop:** look + move → find keys/targets → interact or shoot → open the exit → next room.
**Verbs:** move (WASD/stick), look (drag/right stick), interact, shoot, jump (optional).

**Kit setup** (no first-person rig; emulate it):
- `camera: { mode:"third-person", distance: 0.15, pitch: 0.05, minPitch: -0.9, maxPitch: 0.9, lookAtHeight: 0.9·h, collide: false }`; hide the hero model (`this.player.model.visible = false`); `fov` 70–75. Playtest the look direction; if it misbehaves fall back to distance 2.5 over-the-shoulder.
- Moving is camera-relative already (`NK3D.character`).

**Tuning** (h = hero height, ~1.8 u for a human in 1 u = 1 m kits; KayKit h ≈ 2.5):
- Walk 2.5 h/s, run 4 h/s; accel per kit damp; no head-bob by default (and never with reduce motion).
- Look sensitivity (`camera.sensitivity`) 0.004–0.006 rad/px; vertical look clamped ±50°.
- Shoot: `this.physics.raycast(this.camera.position, this.camera.getWorldDirection(v), 50, this.player.handle)` (exclude your own capsule); 3–6 shots/s; crosshair centre (HUD), hit marker 0.1 s.
- Targets/enemies: ≤ 50% of walk speed when approaching, 0.6 s telegraph (glow/sound) before attacking, 1–3 hits.
- Interact range 2 u with a prompt ("E" / "tap the hand button") when the crosshair ray hits an interactable.

**Levels:**
- Corridors ≥ 2.5 h wide, ceilings ≥ 1.8 h; rooms 8–20 u; doors at least 1.2 h wide.
- Landmarks (lights, colour per zone) so the player never feels lost; ≤ 3 rooms in a key/door chain; the exit always marked.
- Contrast: keys/targets emissive or lit; ≤ 4 point lights total; fog for depth.

**Progression/win-lose:** escape/time trial: best time saved; shooting gallery: score in 60 s with combo; arena: survive waves; health 3–5.

**Mobile:** `touch: { stick: "left", look: true, buttons: [{action:"action" /* shoot/interact */}, {action:"jump"}] }`; aim assist on touch: snap toward a target within 6° of the crosshair.

**Juice:** muzzle flash + recoil kick of the camera pitch (0.01 rad, skip on reduce motion), impact sparks/decals (pooled), target pop + score number, door open sound + light change, footsteps via `NK3D.sound`.

**Mistakes:** motion sickness (head-bob, FOV < 60, low fps, camera roll); no crosshair; interactables you can't tell apart; dark mazes; enemies hitting from behind without sound cues; > 150 draw calls.

**Assets:** `kenney/modular-dungeon-kit`, `kenney/modular-space-kit`, `kenney/space-station-kit`, `kaykit/dungeon-pack`, `kenney/blaster-kit`, `kenney/prototype-kit`, `kenney/shooting-gallery` (2D gallery), `kenney/crosshair-pack`; sound `kenney/sci-fi-sounds`, `kenney/impact-sounds`.
