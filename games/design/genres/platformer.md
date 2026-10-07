# Platformer (2D side view) — phaser-2d, arcade
**Loop:** run → jump gaps/enemies → grab coins → reach the flag; die → respawn at checkpoint.
**Verbs:** run, jump (variable), stomp; optional: dash, wall-jump, double jump (add one per level, never all at once).

**Tuning** (T = tile px; baseline = sample Slime Hop: T 64, gravity 1800, jumpV 1000, run 430, maxVy 1300):
- Run 6.5–10 T/s (18 px: 120–180 px/s; 64 px: 420–640 px/s). Ground lerp 0.3/step, air 0.12.
- Apex 3–4.5 T, time-to-apex 0.38–0.55 s → `gravity = 2·H·T/ta²`, `jumpV = 2·H·T/ta` (18 px, 3.5 T, 0.42 s → 714 / 300; 64 px, 3.5 T, 0.45 s → 2212 / 996).
- Max jump distance D = run · 2·jumpV/gravity (sample 7.5 T). Early gaps ≤ 0.7·D, ledges ≤ 0.8·apex.
- Coyote 0.1 s, buffer 0.12 s, release cut ×0.82/step while rising. maxVy ≈ 1.3·jumpV.
- Stomp: falling and feet ≤ 22 px into the enemy top; bounce 0.65·jumpV (0.9 holding jump). Hurt: knock-back 380/−560, blink 1.6 s.
- Enemies: walkers 1.5–3 T/s (≤ 60% of run; sample slime 95 px/s), turn at walls and ledges; flyers on sine paths.
- Body ≈ 70% of sprite width, feet at the sprite bottom.

**Levels:**
- 60–120 tiles long, 12–16 tall; the bottom is open (pits kill → respawn + lose a life).
- Spawn on flat ground with 6+ safe tiles. First gap ≥ 15 tiles in, 2–3 tiles wide over ground or a shallow pit.
- Coin trails show the jump arc (arcs, not lines); risky coins pay more.
- One-way `=` platforms 3–4 T above the floor; never put a ceiling over a gap within 1 tile of the arc.
- Checkpoint flag every 30–60 s of play. Goal flag on flat ground, visible from 8 tiles.
- Each level adds ONE thing: L1 run/jump/coins, L2 enemies, L3 moving platforms or spikes, then combos.

**Progression/win-lose:** 3–6 levels via `NK.run.level++`; 3 lives; win = last flag → `NK.gameOver({win:true})`. Stars: all coins, no deaths, time.

**Mobile:** `touch: { stick: "arrows", buttons: [{action:"jump"}] }`; a second button only for a taught verb. Camera `offsetY` keeps the hero above the thumbs.

**Juice:** jump squash 1.15/0.85 for 80 ms; land dust; coin sparkle + rate rising per chained coin; stomp hit-stop 60 ms + shake 80 ms/0.004; hurt flash + blink; flag jingle + 1.4 s pause.

**Mistakes:** floaty jump (apex > 0.6 s); gaps at max distance; enemies at spawn; spikes in decor colours; blind drop-offs; unreachable coins (run reachability).

**Assets:** `kenney/new-platformer-pack` (64 px, sample), `kenney/pixel-platformer` (18 px, zoom 3; + sets `kenney/pixel-platformer-blocks`, `-farm-expansion`, `-food-expansion`, `-industrial-expansion`), `kenney/platformer-pack-medieval`, `kenney/abstract-platformer`, `kenney/1-bit-platformer-pack`, `kenney/platformer-assets-extra-animations-enemies`; music `kenney/music-loops`, jingles `kenney/music-jingles`.
