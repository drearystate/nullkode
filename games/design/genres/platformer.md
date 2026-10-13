# Platformer (2D side view) — phaser-2d, arcade
**Loop:** run → jump gaps/enemies → coins → flag; die → checkpoint.
**Verbs:** run, jump (variable), stomp; optional: dash, wall-jump, double jump (add one at a time).

**Tuning** (T = tile px; sample Slime Hop: T 64, gravity 1800, jumpV 1000, run 430, maxVy 1300):
- Run 6.5–10 T/s (18 px: 120–180 px/s; 64 px: 420–640 px/s). Ground lerp 0.3/step, air 0.12.
- Apex 3–4.5 T, time-to-apex 0.38–0.55 s → `gravity = 2·H·T/ta²`, `jumpV = 2·H·T/ta` (18 px, 3.5 T, 0.42 s → 714 / 300; 64 px, 3.5 T, 0.45 s → 2212 / 996).
- Jump distance D = run · 2·jumpV/gravity (sample 7.5 T). Early gaps ≤ 0.7·D, ledges ≤ 0.8·apex.
- Coyote 0.1 s, buffer 0.12 s, release cut ×0.82/step while rising. maxVy ≈ 1.3·jumpV.
- Stomp: falling, feet ≤ 22 px into enemy top; bounce 0.65·jumpV (0.9 holding jump). Hurt: knock-back 380/−560, blink 1.6 s.
- Enemies: walkers 1.5–3 T/s (≤ 60% of run; sample slime 95 px/s), turn at walls/ledges; sine-path flyers.
- Body ≈ 70% sprite width, feet at sprite bottom.

**Levels:**
- 60–120 × 12–16 tiles; open bottom (pit → respawn, −1 life).
- Spawn on 6+ flat safe tiles; first gap ≥ 15 tiles in, 2–3 wide over ground or a shallow pit.
- Coin arcs trace jumps; risky ones pay more.
- One-way `=` platforms 3–4 T up; no ceiling within 1 tile of a jump arc.
- Checkpoint every 30–60 s; goal flag on flat ground, seen from 8 tiles.

**Progression/win-lose:** flag → `NK.run.level++`; 3 lives.

**Full game:** 8–12 levels (levels/*.json), 2–3 themed worlds, each ending in a boss/set piece; 15–25 min. New enemy, tile or verb every 1–2 levels (L1 run/jump/coins, L2 enemies, L3 platforms/spikes; teach → test → twist), breathers after spikes. World map; `NK.save` progress + stars (Continue); final boss → ending screen, `NK.gameOver({win:true})`; replay = stars (all coins, no deaths, time), best times. Slice (phase 1): menu + world 1 levels 1–2 with final art, HUD, sound.

**Mobile:** `touch: { stick: "arrows", buttons: [{action:"jump"}] }`; 2nd button only once taught; camera `offsetY` lifts the hero over thumbs.

**Juice:** squash 1.15/0.85 80 ms; land dust; coin sparkle + pitch ladder; stomp hit-stop 60 ms + shake 80 ms/0.004; hurt flash; flag jingle + 1.4 s pause.

**Mistakes:** floaty jump (apex > 0.6 s); max-distance gaps; enemies at spawn; decor-coloured spikes; blind drops; unreachable coins (run reachability).

**Assets:** `kenney/new-platformer-pack` (64 px, sample), `kenney/pixel-platformer` (18 px, zoom 3; + `kenney/pixel-platformer-blocks`, `-farm-expansion`, `-food-expansion`, `-industrial-expansion`), `kenney/platformer-pack-medieval`, `kenney/abstract-platformer`, `kenney/1-bit-platformer-pack`, `kenney/platformer-assets-extra-animations-enemies`; sound `kenney/music-loops`, `kenney/music-jingles`.
