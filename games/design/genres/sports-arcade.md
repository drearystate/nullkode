# Sports / arcade (pong, breakout, pinball, air hockey, minigolf) — phaser-2d (arcade; pinball/minigolf: matter)
**Loop:** serve → keep the ball in play / aim the shot → score → speed rises → match point or level clear.
**Verbs:** move paddle, serve/launch, flip, aim + power, nudge.

**Tuning** (1280×720 game px):
- Breakout: paddle 140–180 px wide (shrinks later), paddle speed ≥ 1.6× ball horizontal speed (or follow the pointer 1:1). Ball ≥ 16 px, start 420–500 px/s, +3% per 10 bricks, cap 900. Bounce angle by hit offset (±60° from vertical); never within 15° of horizontal. Bricks 64×32 with 4 px gaps, 6–10 rows.
- Pong: paddle 100–130 px tall; AI speed 70–85% of the ball's vertical speed, reaction delay 0.1–0.2 s, aim error ±15 px; ball +5% per rally hit, cap 1000; first to 7.
- Pinball (matter): gravity 700–1000 px/s² (tilted table), ball radius 14–18 px, flipper rotation 0.08 s to full, angular speed 18–25 rad/s, bumper kick 600–900 px/s; ball save 10 s at launch; nudge ±60 px/s, 3 nudges/5 s before tilt.
- Minigolf: drag-back aim, power 0–1200 px/s, rolling friction to stop in 1.5–4 s, hole capture if speed < 350 px/s within the cup radius.
- Arcade: `setBounce(1)` + `setCollideWorldBounds`; clamp speed every step; keep the vertical component ≥ 25% of speed (no endless horizontal loops).

**Levels/content:**
- Breakout L1: no tough bricks; then 2-hit bricks, unbreakables (distinct look), moving bricks. Power-ups fall at 150 px/s: wide paddle, multi-ball, slow, laser; 10–15% drop chance.
- Pinball: 2–4 lit targets that form a mission; ramps light the multiplier.
- Minigolf: 9 holes, par 2–4, one new obstacle per hole.

**Progression/win-lose:** lives 3 (breakout/pinball 3 balls); pong/hockey first to 7; golf strokes vs par; best score saved, leaderboards.

**Mobile:** paddle follows the finger X directly (Phaser pointer, finger offset so the paddle isn't hidden); serve = tap; pinball: touch the left/right screen half = that flipper (pointer x < W/2), `touch: { stick: false, buttons: [] }`; golf: drag anywhere.

**Juice:** ball trail, paddle squash on hit, brick break particles in its colour + rising pitch per combo, hit-stop 30 ms on last brick, ball speed-up whoosh, pinball bumper flash + score pop, golf ball drop jingle.

**Mistakes:** ball tunnelling at high speed (cap speed < 50 px per step); endless horizontal bounces; AI that never misses; ball too small/same colour as bricks; paddle hidden under the thumb; random bounce angles.

**Assets:** `kenney/puzzle-pack-2` (balls, paddles, tiles), `kenney/puzzle-pack-1`, `kenney/brick-pack`, `kenney/sports-pack`, `kenney/physics-assets`, `kenney/isometric-minigolf`; 3D `kenney/minigolf-kit`, `kenney/mini-arcade`; sound `kenney/impact-sounds`, `kenney/digital-audio`, `kenney/retro-sounds-2`.
