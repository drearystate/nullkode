# Sports / arcade (pong, breakout, pinball, air hockey, minigolf) — phaser-2d (arcade; pinball/minigolf: matter)
**Loop:** serve → keep the ball in play / aim → score → speed rises → match point or level clear.
**Verbs:** move paddle, serve/launch, flip, aim + power, nudge.

**Tuning** (1280×720 game px):
- Breakout: paddle 140–180 px (shrinks later), speed ≥ 1.6× ball horizontal speed (or pointer 1:1). Ball ≥ 16 px, start 420–500 px/s, +3% per 10 bricks, cap 900. Bounce angle by hit offset (±60° from vertical), never < 15° from horizontal. Bricks 64×32, 4 px gaps, 6–10 rows.
- Pong: paddle 100–130 px tall; AI 70–85% of ball vertical speed, reaction delay 0.1–0.2 s, aim error ±15 px; ball +5% per rally hit, cap 1000; first to 7.
- Pinball (matter): gravity 700–1000 px/s², ball radius 14–18 px, flipper full in 0.08 s at 18–25 rad/s, bumper kick 600–900 px/s; ball save 10 s at launch; nudge ±60 px/s, 3 nudges/5 s before tilt.
- Minigolf: drag-back aim, power 0–1200 px/s, rolls to a stop in 1.5–4 s; cup captures < 350 px/s within its radius.
- Arcade: `setBounce(1)` + `setCollideWorldBounds`; clamp speed every step; vertical component ≥ 25% of speed.

**Levels/content:**
- Breakout L1: no tough bricks; then 2-hit bricks, unbreakables (distinct look), moving bricks. Power-ups fall at 150 px/s: wide paddle, multi-ball, slow, laser; 10–15% drop.
- Pinball: 2–4 lit targets = a mission; ramps light the multiplier.
- Minigolf: par 2–4, one new obstacle per hole.

**Progression/win-lose:** 3 lives/balls; golf strokes vs par; leaderboards.

**Full game:** breakout 20–30 layouts (levels/*.json) in 3 worlds + a boss brick each; minigolf 18 holes, 2 courses; pong/hockey a ladder of 5–6 AI rivals; pinball 6–10 missions + wizard mode; 15+ min, a new brick/obstacle/rival trick every 1–2 levels. Level select, `NK.save` (Continue); last world/rival → ending screen; replay = stars, best score/strokes. Slice (phase 1): menu + first 2 levels/holes/rivals.

**Mobile:** paddle follows finger X (pointer, offset above the thumb); serve = tap; pinball: screen half = that flipper (pointer x < W/2); golf: drag anywhere; `touch: { stick: false, buttons: [] }`.

**Juice:** ball trail, paddle squash, brick-colour particles, combo pitch ladder, last-brick hit-stop 30 ms, speed-up whoosh, bumper flash + score pop, cup jingle.

**Mistakes:** tunnelling (cap < 50 px per step); AI that never misses; small/brick-coloured ball; paddle under the thumb; random bounce angles.

**Assets:** `kenney/puzzle-pack-2` (balls, paddles, tiles), `kenney/puzzle-pack-1`, `kenney/brick-pack`, `kenney/sports-pack`, `kenney/physics-assets`, `kenney/isometric-minigolf`; 3D `kenney/minigolf-kit`, `kenney/mini-arcade`; sound `kenney/impact-sounds`, `kenney/digital-audio`, `kenney/retro-sounds-2`.
