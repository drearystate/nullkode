# Puzzle (grid / sokoban / physics) — phaser-2d (grid: gravity 0; physics: `physics:"matter"`)
**Loop:** read the level → plan → move/place/shoot → solve → stars by moves/shots → next level.
**Verbs:** grid: step, push, pull, rotate, swap; physics: aim, launch, drop, remove, draw.

**Tuning:**
- Grid cells 64–96 game px (≥ 96 when tapped directly); board fills ≤ 80% of the screen with HUD outside it.
- Move tween 0.10–0.14 s, buffer 1 move during a tween, hold-to-repeat after 0.25 s every 0.12 s.
- Undo (Z / button, unlimited) and restart (R / button) always available; undo is instant.
- Physics: gravity 600–1000 px/s², friction 0.5–0.8, restitution ≤ 0.3; stacks settle < 2 s; shot power capped, trajectory dots for the first 30–40% of the arc; result judged after bodies sleep (speed < 0.1 for 1 s).

**Levels:**
- 3–5 teaching levels, each with one idea and ≤ 4 moves; then 10–30 levels; difficulty saw-tooth (hard, easy, harder).
- Every level verified solvable by code: sokoban/grid = BFS over states (player cell + sorted box cells), cap 200k states; store the shortest solution length as par.
- Sokoban dead squares: a box in a non-goal corner is lost → show it (tint) and suggest undo.
- Levels are small: 5×5 to 10×8 interior; ≤ 6 boxes; every object must matter.
- Goals and movable objects visually distinct (goal = outline/marker, box = solid, wall = darker).
- Physics: hand-place structures; test 20 random seeds of small perturbation — the intended solution works ≥ 90%.

**Progression/win-lose:** level select grid with stars (3 = par, 2 = par +30%, 1 = solved); next level unlocks on solve (`NK.save`). No lose state in grid puzzles; physics puzzles: shots run out → retry 1 tap.

**Mobile:** grid: swipe (≥ 30 px) or tap a neighbour cell; on-screen undo/restart buttons ≥ 96 game px at the top, not bottom corners; `touch: { stick: false, buttons: [] }` when the board is tapped directly. Physics: drag back from the launcher to aim (slingshot).

**Juice:** box slide with a tiny settle bounce; goal tile lights + chime when filled; solve = all goals pulse, confetti ≤ 1 s, jingle, stars fill one by one (0.25 s each); invalid move = bump 4 px + soft thud (no shake).

**Mistakes:** unsolvable or trivially solvable levels; no undo; ambiguous walls vs floor; unexplained new tile types; physics randomness deciding success; tiny tap targets on phones; timers in thinking puzzles.

**Assets:** `kenney/sokoban-pack` (64 px), `kenney/block-pack`, `kenney/physics-assets` (70 px blocks), `kenney/puzzle-pack-1`, `kenney/rolling-ball-assets`, `kenney/1-bit-pack`, `kenney/pattern-pack`; UI `kenney/ui-pack`, `kenney/medals`; sound `kenney/interface-sounds`, `kenney/impact-sounds`.
