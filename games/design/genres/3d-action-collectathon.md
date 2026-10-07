# 3D third-person action / collectathon — three-3d
**Loop:** explore a hub/level → platform and fight → collect coins and big stars → open the goal (chest, door, portal) → next area.
**Verbs:** run, jump, attack, interact; optional: double jump, ground pound, dash.

**Tuning** (h = hero height; sample Crypt Run with KayKit h ≈ 2.5: speed 4.5, runSpeed 8, jump 10.5, gravity −25):
- Walk ≈ 1.8 h/s, run ≈ 3.2 h/s. Apex `jump²/(2|g|)` ≈ 0.9 h (sample 2.2 u); airtime `2·jump/|g|` ≈ 0.84 s; run-jump distance ≈ 6.7 u, walk-jump 3.8 u.
- Early gaps ≤ 0.7 × run-jump (≤ 4.7 u at sample values); ledges ≤ 0.8 × apex (≤ 1.75 u); steps ≤ 0.35 u walk up (autostep); slopes ≤ 50°.
- Add in the hero's fixedUpdate (the kit lacks them): coyote 0.1 s, buffer 0.12 s (set `velocity.y = jumpSpeed` yourself), release cut `velocity.y *= 0.5` once while rising, clamp `velocity.y ≥ −30`.
- Camera: `distance 7–9, pitch 0.4–0.55, lookAtHeight 0.8 h`. Drop shadow/blob under the hero to judge landings.
- Attack reach 1.5–1.7 u in front, cooldown 0.5 s. Enemies: patrol 2.2, chase ≤ 60% of run speed (sample 4.4 within 10 u), swing wind-up ≥ 0.4 s, 2–3 hits to kill.
- Health 3–5; hit = 0.5–1 s invulnerability + knock-back 2 u.

**Levels:**
- Units from catalog `metrics.bbox` (KayKit floor 4 u, wall 4 u high; Kenney kits ~1 u). Floors/walls via `NK3D.instances` + `physics:"fixed"`.
- Area 30–60 u across; spawn on a flat safe plaza with the goal or a landmark visible.
- Coins in lines/arcs 1.5–2 u apart showing paths and jumps; 50–100 coins + 3–5 big stars behind small challenges.
- Kill-plane at y < −10 → respawn at the last checkpoint (lose 1 health, not the run).
- Moving platforms ≤ 2 u/s; no jumps needing camera spin to see the landing.

**Progression/win-lose:** goal unlocks at N coins/stars (HUD shows "8 / 12"); win → `NK.gameOver({win:true, score})`; lose at 0 health. Stars/coins per level saved.

**Mobile:** `touch: { stick: "left", look: true, buttons: [{action:"jump"}, {action:"action", icon: sword}] }`; run = stick pushed fully (kit does this).

**Juice:** coin spin + bob + pitch ladder; jump/land dust; land squash (scale 1.1/0.9, 0.1 s); hit flash + hit-stop 60 ms; star pickup = slow spin + jingle + toast; chest lid animation.

**Mistakes:** gaps judged without a shadow; camera inside walls (keep `collide`); enemies faster than the hero; coins floating unreachable; scale mixing (Kenney 1 u next to KayKit 4 u); > 4 point lights.

**Assets:** `kaykit/platformer-pack`, `kaykit/adventurers`, `kaykit/character-animations`, `kaykit/skeletons`, `kaykit/dungeon-pack`, `kaykit/forest-nature-pack`, `kenney/platformer-kit`, `kenney/mini-characters`; sound `kenney/impact-sounds`, `kenney/foley-sounds`.
