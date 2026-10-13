# Puzzle (grid / sokoban / physics) — phaser-2d (grid: gravity 0; physics: `physics:"matter"`)
**Loop:** read → plan → move/place/shoot → solve → stars by moves/shots → next.
**Verbs:** grid: step, push, pull, rotate, swap; physics: aim, launch, drop, remove, draw.

**Tuning:**
- Grid cells 64–96 game px (≥ 96 if tapped); board ≤ 80% of the screen, HUD outside it.
- Move tween 0.10–0.14 s, buffer 1 move, hold-to-repeat after 0.25 s every 0.12 s.
- Undo (Z / button, unlimited, instant) and restart (R / button) always available.
- Physics: gravity 600–1000 px/s², friction 0.5–0.8, restitution ≤ 0.3; stacks settle < 2 s; shot power capped, trajectory dots for the first 30–40% of the arc; judge after bodies sleep (speed < 0.1 for 1 s).

**Levels:**
- Every level verified solvable by code: sokoban/grid = BFS over states (player cell + sorted box cells), cap 200k states; store the shortest solution length as par.
- Dead squares: a box in a non-goal corner is lost → tint it, suggest undo.
- Small: 5×5 to 10×8 interior; ≤ 6 boxes; every object must matter.
- Goal = outline/marker, box = solid, wall = darker; all visually distinct.
- Physics: hand-placed; over 20 seeds of small perturbation the intended solution works ≥ 90%.

**Progression/win-lose:** stars 3 = par, 2 = par +30%, 1 = solved; next level unlocks on solve. No lose state in grid puzzles; physics: shots run out → retry 1 tap.

**Full game:** 24–40 levels (levels/*.json or a seeded generator, each BFS-checked) in 4–6 chapters; 20–40 min. Each chapter teaches one new tile/mechanic (ice, key, switch, portal) in 1–2 tiny levels (≤ 4 moves), then mixes it with old ones; saw-tooth difficulty (hard, easy, harder), a showpiece level ends each chapter. Level select with stars + chapter locks, `NK.save` (Continue); ending screen after the last level; replay = 3 stars. Slice (phase 1): menu + level select + chapter 1 complete.

**Mobile:** grid: swipe (≥ 30 px) or tap a neighbour; undo/restart ≥ 96 game px at the top; `touch: { stick: false, buttons: [] }` when tapping the board. Physics: drag back from the launcher (slingshot).

**Juice:** box slide + tiny settle bounce; goal lights + chime when filled; solve = goals pulse, confetti ≤ 1 s, jingle, stars fill one by one (0.25 s each); invalid move = bump 4 px + soft thud (no shake).

**Mistakes:** unsolvable/trivial levels; no undo; walls that look like floor; unexplained tiles; luck deciding physics shots; tiny tap targets; timers in thinking puzzles.

**Assets:** `kenney/sokoban-pack` (64 px), `kenney/block-pack`, `kenney/physics-assets` (70 px blocks), `kenney/puzzle-pack-1`, `kenney/rolling-ball-assets`, `kenney/1-bit-pack`, `kenney/pattern-pack`; UI `kenney/ui-pack`, `kenney/medals`; sound `kenney/interface-sounds`, `kenney/impact-sounds`.
