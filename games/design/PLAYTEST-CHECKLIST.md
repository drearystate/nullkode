# PLAYTEST CHECKLIST
Run after the level, enemies and polish steps (and when the person reports "too hard / can't reach"). Inputs: screenshots (spawn at t = 1 s, after 3 s of moving right/forward, near the first hazard, the same spawn view in an 844×390 touch viewport, menu, game-over), the status message (`fps`, `frameMs`, `worstMs`, `errorCount`, `stats`) and the game files (config, levels, entities).
Answer each item yes/no. Report only the "no" items as `PT-id | severity | evidence (number or screenshot) | fix (file + change)`. Blockers are fixed before the next step; should-fix in the next step or polish; polish when there is room.
Item tags: `[severity][stages]`, stages = level, enemies, polish (all = every pass).

## Runs
- PT-01 [blocker][all] No runtime errors? `errorCount == 0` after load, start and 5 s of play.
- PT-02 [blocker][all] Menu → Start → playing works and pause/resume works? state goes menu → play; Esc → pause → play.
- PT-03 [should-fix][all] Smooth? avg `fps ≥ 55` desktop, `worstMs < 50`.

## Level and reachability (compute, see Automatic checks)
- PT-10 [blocker][level] Goal reachable from spawn? A1 + A3.
- PT-11 [blocker][level] No soft-lock? Every node reachable from spawn can reach the goal, or is a death zone that respawns (A3).
- PT-12 [should-fix][level] All collectibles reachable? A3; unreachable ones are moved or removed.
- PT-13 [should-fix][level] Early gaps ≤ 70% of max jump distance and ledges ≤ 80% of max height (first level / first 30% of a level)? A1/A2 vs level data.
- PT-14 [blocker][level] Spawn clear? Player box at spawn overlaps no solid tile/collider and has ground ≤ 1 tile (1 u) below (A4).
- PT-15 [should-fix][level] Safe start? No enemy/hazard within 6 tiles (8 u) of spawn; the spawn screenshot shows no threat.
- PT-16 [should-fix][level] No blind jumps? For each jump edge in A3, the landing lies inside the camera view from the take-off point (view = 1280×720 / zoom around the follow target).
- PT-17 [should-fix][level] Checkpoints ≤ 60 s of play apart? path length (tiles) ÷ run speed (tiles/s) between checkpoints ≤ 60.

## Player feel (read the player code)
- PT-20 [should-fix][level] Coyote time 0.08–0.12 s, jump buffer 0.1–0.15 s and variable jump present (platforming genres)?
- PT-21 [should-fix][level] Time-to-apex 0.35–0.55 s (`jumpV / gravity`) and fall speed capped?
- PT-22 [polish][level] Accel to full speed 0.08–0.15 s and stop ≤ 0.12 s (lerp factor ≈ 0.25–0.35 per step; 3D damp ≈ 14)?
- PT-23 [should-fix][level] Camera keeps the player inside the middle 60% of the screen while moving (screenshot 2)?

## Readability (screenshots)
- PT-30 [should-fix][level] Player contrast ≥ 3:1 against the surrounding background (A7); < 2:1 = blocker.
- PT-31 [should-fix][enemies] Hazards and enemies look dangerous and differ from decor and pickups (shape/animation, not colour only)?
- PT-32 [should-fix][enemies] Enemy attacks telegraphed ≥ 0.4 s (wind-up/flash timer in code)?
- PT-33 [should-fix][enemies] Damage hitboxes ≤ 85% of the sprite (body `setSize` vs frame size); pickup hitboxes ≥ sprite?
- PT-34 [polish][level] Hero is 1/12–1/6 of the view height; pixel art crisp (`pixelArt: true`, integer zoom)?

## Enemies and fairness
- PT-40 [should-fix][enemies] Early enemy speed ≤ 60% of the player's (A5)?
- PT-41 [should-fix][enemies] Hurt gives knock-back + ≥ 1 s invulnerability, and no damage source can hit twice in one step?
- PT-42 [blocker][enemies] Losing is possible and correct: lives/health reach 0 → `NK.gameOver({win:false})`; falling off the map costs a life and respawns?
- PT-43 [should-fix][enemies] No off-screen or unwarned instant deaths?

## Feedback and juice
- PT-50 [should-fix][polish] Every action has a sound AND a visual (jump, land, pickup, hit, hurt, death, win, UI click)? grep `NK.audio.play` per event.
- PT-51 [polish][polish] Hit-stop 50–100 ms on strong hits, particles ≤ 20 per burst, score pops, HUD bump?
- PT-52 [should-fix][polish] Shake ≤ 200 ms and ≤ 0.01, not on frequent events, skipped when `NK.settings.get("reduceMotion")`?
- PT-53 [polish][polish] Repeated SFX vary `rate` 0.9–1.1; music volume ≤ 0.6?

## Flow and UI
- PT-60 [blocker][polish] Win is reachable and calls `NK.gameOver({win:true, score})`; retry works from the result screen?
- PT-61 [should-fix][polish] Menu subtitle says the goal in ≤ 10 words; first mechanic prompt names the active device's control?
- PT-62 [should-fix][polish] HUD ≤ 4 items, text ≥ 24 game px, readable on the 844×390 screenshot?
- PT-63 [polish][polish] A replay reason exists (best score/time, stars, unlocks)?

## Mobile and accessibility
- PT-70 [blocker][polish] `config.touch` set and every required action has a touch control (or direct touch for board/UI games)?
- PT-71 [should-fix][polish] No HUD, button or key game object under the touch controls (A6)?
- PT-72 [should-fix][polish] In-canvas tap targets ≥ 96 game px (≥ 48 CSS px at 844×390)?
- PT-73 [should-fix][polish] `orientation` set; portrait games use 720×1280?
- PT-74 [should-fix][polish] No colour-only information (states also differ by icon/shape/text)?

## Performance (status `stats`)
- PT-80 [should-fix][polish] 2D: `objects ≤ 400`, `bodies ≤ 120`; 3D: `calls ≤ 150`, `triangles ≤ 300000`, point lights ≤ 4?
- PT-81 [should-fix][polish] Bullets/particles/enemies pooled (no `new`/`add.sprite` in per-step code after `create`)? objects count stable over 30 s.

## Automatic checks (code can run these)
**A1. 2D jump envelope (Arcade).** g = `config.gravity` (+ `body.gravity.y` if set), v = jump speed, s = max run speed, m = fall-gravity multiplier (1 if none), T = tile px.
`H = v²/(2g)`, `t_up = v/g`, `t_down(dh) = √(2(H − dh)/(m·g))`, `D(dh) = s·(t_up + t_down(dh))` for a target dh tiles·T above take-off (dh ≤ H; negative = lower). Tiles: divide by T. Fail (blocker) when a required jump has `dx > 0.95·D(dh)` or `dh > 0.95·H`; early-level limits 0.7·D and 0.8·H. Sample Slime Hop (g 1800, v 1000, s 430, T 64): H = 4.34 T, D(0) = 7.47 T → early gaps ≤ 5.2 T, ledges ≤ 3.5 T. Arcade steps at 60 Hz, so the formula is within ~2%; for edge cases simulate: each step `vy += g·dt; y += vy·dt; x += s·dt` with the body box against the tile grid.
**A2. 3D jump envelope (Rapier character).** g = |`config.gravity`| (or the character's `gravity`), j = `jump`, s = `runSpeed` (`speed` if the game has no run). `H = j²/(2g)`, `air(dh) = (j + √(j² − 2g·dh))/g`, `D(dh) = s·air(dh)`. Steps ≤ 0.35 u need no jump (autostep), slopes ≤ 50° walkable. Sample Crypt Run (g 25, j 10.5, run 8, walk 4.5): H = 2.2 u, D = 6.7 u (walk 3.8). Measure gaps between fixed colliders' top faces from level data + `NK3D.size(key)` bboxes.
**A3. Platform graph BFS.** Parse the ASCII rows (or Tiled `ground` layer + objects). Node = empty cell with `ceil(bodyH/T)` empty cells above and a solid or one-way cell below, not a hazard. Edges: walk to the side neighbour; fall off an edge to the first node below in that column (±1 column); jump to any node with `dh ≤ 0.95·H/T` and `|dx| ≤ D(dh)/T` whose arc (sampled 20 points with the body box) hits no solid tile (one-way cells pass from below). BFS from the spawn node → R. Reverse BFS from the goal → G. Goal ∈ R; nodes in R − G that are not a fall-to-death zone = soft-lock (blocker). A collectible is reachable if its cell lies within some jump arc or walk path from R. Top-down: 4-neighbour BFS over walkable tiles with doors shut; add a door's far side once its key is reachable; repeat until nothing changes. Sokoban: BFS over (player, boxes) states. Metroidvania: BFS per ability set in pickup order. Tower defence: path BFS after every placement. Match-3: at least one valid swap after each resolve.
**A4. Spawn in geometry.** 2D: the body rect at spawn (`x ± bodyW/2`, bottom at `s.bottom`) overlaps no `ground` tile; same for every enemy and pickup. 3D: `this.physics.raycast(new THREE.Vector3(x, y + 1, z), new THREE.Vector3(0, -1, 0), 2)` hits ground; no fixed collider bbox overlaps the capsule or a pickup.
**A5. Speed ratio.** Enemy speed constant ÷ player run speed (Slime 95 / 430 = 0.22 pass; skeleton chase 4.4 / 8 = 0.55 pass); > 0.6 in level 1 = should-fix, > 1.0 for chasers = blocker.
**A6. Touch overlap.** Kit layout in CSS px: `size = clamp(0.3·min(viewW, viewH), 110, 170)`; stick: left 18, bottom 18, size×size (arrows: two `0.62·size` squares, 14 px apart); buttons from the right: #1 `0.66·size` at right 18, #2 `0.52·size` at right `18 + 0.72·size`, #3 above #1 at bottom `18 + 0.74·size`. Game → CSS: `k = min(viewW/1280, viewH/720)`, offset = letterbox. Test 844×390, 390×844, 1024×768. Any overlap with HUD/buttons/goal text = should-fix; covering lives, timer or the player = blocker.
**A7. Contrast.** From the screenshot: mean colour of the player's pixels (atlas alpha mask or bbox minus the background) vs mean of a ring 1× the bbox around it. Linearise sRGB (`c ≤ 0.04045 ? c/12.92 : ((c + 0.055)/1.055)^2.4`), `L = 0.2126R + 0.7152G + 0.0722B`, ratio `(L1 + 0.05)/(L2 + 0.05)`. ≥ 3 pass, 2–3 should-fix, < 2 blocker. Repeat for the main hazard and pickup.
