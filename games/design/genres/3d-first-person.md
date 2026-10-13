# 3D first-person (simple) — three-3d
Fits: maze/escape room, exploration, shooting gallery, simple arena shooter; not a full FPS.
**Loop:** move + look → keys/targets → interact or shoot → exit → next room.
**Verbs:** move (WASD/stick), look (drag/right stick), interact, shoot, jump (optional).

**Kit setup** (no first-person rig; emulate it):
- `camera: { mode:"third-person", distance: 0.15, pitch: 0.05, minPitch: -0.9, maxPitch: 0.9, lookAtHeight: 0.9·h, collide: false }`; hide the hero (`this.player.model.visible = false`); `fov` 70–75. Playtest look; if wrong, use distance 2.5 over-the-shoulder.
- Movement is camera-relative (`NK3D.character`).

**Tuning** (h = hero height: ~1.8 u in 1 u = 1 m kits; KayKit ≈ 2.5):
- Walk 2.5 h/s, run 4 h/s; accel per kit damp; no head-bob.
- Look sensitivity (`camera.sensitivity`) 0.004–0.006 rad/px; vertical clamp ±50°.
- Shoot: `this.physics.raycast(this.camera.position, this.camera.getWorldDirection(v), 50, this.player.handle)` (skip own capsule); 3–6 shots/s; crosshair centre (HUD), hit marker 0.1 s.
- Targets/enemies: approach ≤ 50% of walk speed, 0.6 s telegraph (glow/sound) before attacks, 1–3 hits.
- Interact: 2 u, prompt ("E" / hand button) when the crosshair ray hits one.

**Levels:**
- Corridors ≥ 2.5 h wide, ceilings ≥ 1.8 h; rooms 8–20 u; doors ≥ 1.2 h.
- Landmarks (lights, zone colours); ≤ 3 rooms per key/door chain; exit always marked.
- Keys/targets emissive or lit; ≤ 4 point lights; fog for depth.

**Progression/win-lose:** escape: best time; gallery: score in 60 s with combo; arena: survive waves; health 3–5.

**Full game:** 6–8 levels (levels/*.json) in 2–3 lit zones, 15–25 min: an escape chain, each room adding a mechanic (keys → switches → codes → hazards), or a gallery/arena of 5+ stages + a boss stage; calmer rooms after hard ones. Level select, `NK.save` (Continue); final exit/boss → ending screen, `NK.gameOver({win:true})`; replay = best times, secrets. Slice (phase 1): menu + levels 1–2 complete.

**Mobile:** `touch: { stick: "left", look: true, buttons: [{action:"action" /* shoot/interact */}, {action:"jump"}] }`; touch aim assist: snap to a target within 6° of crosshair.

**Juice:** muzzle flash + pitch kick 0.01 rad (not with reduce motion), pooled sparks/decals, target pop, door sound + light change, `NK3D.sound` footsteps.

**Mistakes:** motion sickness (head-bob, FOV < 60, low fps, camera roll); no crosshair; indistinct interactables; dark mazes; silent attacks from behind; > 150 draw calls.

**Assets:** `kenney/modular-dungeon-kit`, `kenney/modular-space-kit`, `kenney/space-station-kit`, `kaykit/dungeon-pack`, `kenney/blaster-kit`, `kenney/prototype-kit`, `kenney/shooting-gallery` (2D gallery), `kenney/crosshair-pack`; sound `kenney/sci-fi-sounds`, `kenney/impact-sounds`.
