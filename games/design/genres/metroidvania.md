# Metroidvania (lite) — phaser-2d, arcade (platformer feel)
**Loop:** explore connected rooms → hit an ability gate → find the ability → return and open gates + shortcuts → boss → escape.
**Verbs:** run, jump, attack; gained: double jump, dash, wall-jump, key/bomb. 2–3 abilities total for a lite game.

**Tuning:** use the platformer card's movement numbers (run 6.5–10 T/s, apex 3–4.5 T, coyote/buffer). Ability values:
- Double jump: second jump 70–85% of the first's speed; adds ~0.6 × apex height.
- Dash: 3–4 T in 0.15 s, gravity off during, cooldown 0.4 s or once per airtime; invulnerable optional.
- Wall-jump: slide max 2–3 T/s on walls, kick-off 0.8 × run speed away + 0.9 × jumpV, 0.15 s lock of input toward the wall.
- Attack: 1.5 T reach, 0.25 s, enemies 2–4 hits, knock-back both ways.

**World:**
- 12–25 rooms, each 1–3 screens; doors at fixed spots (room edges) so a room map is easy to draw.
- Each gate shows its requirement (cracked wall = bomb, high ledge = double jump, long gap = dash) and is seen BEFORE its ability is found.
- Every new ability opens ≥ 2 previously seen paths; one-way shortcuts (open from the far side) loop back to save rooms.
- Save rooms/checkpoints every 3–5 rooms and next to the boss; death → last save, keep collected items.
- Verify by code: BFS over rooms with ability sets in pickup order — with abilities {} … {A,B,C} every room/item becomes reachable in order; without ability X its gated rooms must NOT be reachable (the gate works).
- Map overlay (M key / map button): visited rooms, current room, save rooms, item markers (icons).

**Progression/win-lose:** health 3–6 (upgrades +1 hidden in side rooms); 10–20 min first clear; % completion and best time saved; win = final boss → `NK.gameOver({win:true, score})`.

**Mobile:** `touch: { stick: "arrows", buttons: [{action:"jump"}, {action:"action"} /* attack */, {action:"dash"}] }`; a not-yet-unlocked button shows a lock toast when pressed.

**Juice:** ability pickup = freeze 1 s, slow zoom, jingle, toast with the control prompt; gate break particles; dash afterimages (pooled sprites); save room glow + heal sound; boss intro name card.

**Mistakes:** abilities that open nothing seen before; gates that look like walls; long backtracking with no shortcut; save rooms far apart; map missing; soft-locks (one-way drop into an area that needs an ability you don't have).

**Assets:** `kenney/pixel-platformer` (+ `kenney/pixel-platformer-industrial-expansion`), `kenney/1-bit-platformer-pack`, `kenney/platformer-pack-industrial`, `kenney/platformer-assets-pixel`, `kenney/monochrome-pirates`, `kenney/minimap-pack` (map screen); sound `kenney/retro-sounds-1`, `kenney/sci-fi-sounds`.
