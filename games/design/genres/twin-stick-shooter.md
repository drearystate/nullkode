# Top-down shooter / twin-stick — phaser-2d (gravity 0); 3D top-down possible
**Loop:** move + aim + shoot → survive waves → pick upgrades/drops → bigger waves → boss/score.
**Verbs:** move, aim, fire (auto on touch), dash or bomb.

**Tuning** (T = tile px; 64 px sets):
- `gravity: 0`. Player 4–6 T/s (256–384 px/s), accel 0.08 s. Hitbox ≈ 60% of the sprite.
- Bullets 12–18 T/s (≥ 2.5× player), 6–10 shots/s, life ≤ 1.2 s, ±3° spread. Pool 60–120 bullets.
- Enemies: chasers ≤ 60% of player speed in wave 1, up to 85% later; shooters fire 3–5 T/s bullets after a 0.4 s muzzle glow.
- Spawn ≥ 6 T from the player, at the screen edge, with a 0.5 s marker. Max alive: 8 (wave 1) → 30.
- Dash: 3 T in 0.15 s, invulnerable during, cooldown 0.8 s.
- Aim: desktop = pointer (`this.input.activePointer.worldX/Y`); keyboard/pad/touch = auto-aim at the nearest enemy within 8 T (show the target ring).
- Player health 3–5 hits or hearts, 1 s invulnerable after a hit.

**Content:**
- Arena 1.5–3 screens with cover blocks; nothing blocks spawns entirely.
- Waves 30–60 s; one new enemy type per wave; a 5 s breather + drop between waves.
- Enemy roles: chaser, shooter, tank (5–10 HP, slow), splitter, fast flanker. Distinct silhouettes and colours.
- Drops: health 10–15%, power-up 5% (rapid, spread, pierce; 10 s, shown as a HUD timer bar).

**Progression/win-lose:** score = kills × wave multiplier; lose at 0 health → `NK.gameOver({win:false, score})`; win mode: survive N waves or kill the boss. Best score + leaderboard submit.

**Mobile:** `touch: { stick: "left", buttons: [{action:"fire"}, {action:"dash"}] }` with auto-aim + auto-fire while enemies are in range (fire button = hold to focus). Keep enemies from spawning under the thumbs' screen areas.

**Juice:** muzzle flash 1 frame; shell/spark particles; enemy hit flash + tiny knock-back; kill = explosion sprite + hit-stop 40 ms on big ones only; screen shake only on player hit/boss death; low-health heartbeat + red vignette (also an icon).

**Mistakes:** off-screen shooters; bullet colours equal to pickups; spawns on top of the player; endless shake from rapid fire; bullet pools that grow forever; aim lag from smoothing.

**Assets:** `kenney/topdown-shooter` (64 px tiles + characters), `kenney/topdown-tanks-remastered`, `kenney/desert-shooter-pack` (pixel), `kenney/topdown-shooter-pixel`, `kenney/explosion-pack`, `kenney/smoke-particles`, `kenney/crosshair-pack`; 3D `kenney/blaster-kit` + `kenney/mini-arena`; sound `kenney/sci-fi-sounds`, `kenney/impact-sounds`.
