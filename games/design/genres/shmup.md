# Shoot-'em-up (scrolling) — phaser-2d (gravity 0)
**Loop:** fly through scripted enemy waves → dodge bullet patterns → collect power-ups → boss → next stage.
**Verbs:** move (8-way), fire (always on), bomb (screen clear), optional focus (slow move).

**Tuning** (1280×720 side-scroller; vertical: `orientation:"portrait"`, 720×1280):
- Background scroll 60–120 px/s (parallax far layer 0.2×). Ship 380–520 px/s (crosses the short side in 1.4–2 s), focus 50%.
- Ship hurtbox 20–35% of the sprite (a dot in the cockpit); pickups use the full sprite + 20 px.
- Player shots 900–1300 px/s, 8–12/s. Enemy bullets 180–320 px/s (early ≤ 220), large and bright with a dark outline.
- Enemy shots: muzzle glow ≥ 0.4 s before the first shot; aimed shots lead nothing in stage 1.
- Wave every 3–6 s; ≤ 60 enemy bullets on screen in stage 1, ≤ 150 late. Pool everything.
- Lives 3, bombs 2 (refill per life), invulnerable 2 s after respawn (blink).

**Content:**
- Stage 2–3 min: intro 10 s with no shots → waves in formations (V, line, sine, divers) → mid-boss at ~60% → boss.
- Teach one bullet pattern per wave: single aimed → spread of 3 → ring → combined.
- Boss: 3 phases on HP 66/33%, each with a readable pattern and safe gaps ≥ 2× ship hurtbox; HP bar on top.
- Power-ups: 3 shot levels; lose 1 level on death, not all.
- Enemies enter from the leading edge, never spawn on the ship; no shots from off-screen.

**Progression/win-lose:** score per kill + no-hit bonus per wave; extra life every 50k; lose at 0 lives. Best score + stage reached saved.

**Full game:** 5 stages (wave scripts in levels/*.json, distinct backdrops), each 2–3 min with a mid-boss and a boss; 12–18 min. 6+ enemy types, a new enemy or bullet pattern every stage, a calm stretch after each mid-boss. Stage select, `NK.save` (Continue); last boss → ending screen + credits, `NK.gameOver({win:true, score})`; replay = high score, no-hit medals, harder loop. Slice (phase 1): menu + stage 1 with its boss, HUD, sound.

**Mobile:** drag-relative (finger delta × 1.0, ship 120 px above the finger) via Phaser pointer; else `touch: { stick: "left", buttons: [{action:"action"} /* bomb */] }`. Auto-fire always.

**Juice:** muzzle flash, hit sparks, white enemy hit-flash, explosion + debris on kills, boss explosion chain + hit-stop 100 ms + shake 300 ms (only there), score pops, power-up chime.

**Mistakes:** full-sprite hurtbox; bullets coloured like background/pickups; gapless patterns; HUD over play; shake per kill; unrecycled pools.

**Assets:** `kenney/space-shooter-remastered`, `kenney/space-shooter-extension`, `kenney/pixel-shmup` (16 px, zoom 3–4), `kenney/simple-space`, `kenney/tappy-plane` (side), `kenney/explosion-pack`, `kenney/particle-pack`; sound `kenney/sci-fi-sounds`, `kenney/retro-sounds-1`.
