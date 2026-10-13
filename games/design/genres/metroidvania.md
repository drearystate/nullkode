# Metroidvania (lite) — phaser-2d, arcade (platformer feel)
**Loop:** explore rooms → hit an ability gate → find the ability → return, open gates + shortcuts → boss → escape.
**Verbs:** run, jump, attack; gained: double jump, dash, wall-jump, key/bomb. 2–3 abilities total.

**Tuning:** platformer card movement (run 6.5–10 T/s, apex 3–4.5 T, coyote/buffer). Ability values:
- Double jump: second jump 70–85% of the first's speed; adds ~0.6 × apex height.
- Dash: 3–4 T in 0.15 s, gravity off during, cooldown 0.4 s or once per airtime; invulnerable optional.
- Wall-jump: slide max 2–3 T/s on walls, kick-off 0.8 × run speed away + 0.9 × jumpV, 0.15 s input lock toward the wall.
- Attack: 1.5 T reach, 0.25 s, enemies 2–4 hits, knock-back both ways.

**World:**
- Rooms 1–3 screens; doors at room edges so the map is easy to draw.
- Each gate shows its requirement (cracked wall = bomb, high ledge = double jump, long gap = dash) and is seen BEFORE its ability is found.
- Every new ability opens ≥ 2 previously seen paths; one-way shortcuts (open from the far side) loop back to save rooms.
- Save rooms every 3–5 rooms and by bosses; death → last save, keep items.
- Verify by code: BFS over rooms with ability sets in pickup order — with abilities {} … {A,B,C} every room/item becomes reachable in order; without ability X its gated rooms must NOT be reachable (the gate works).
- Map overlay (M key / map button): visited/current/save rooms, item icons.

**Progression/win-lose:** health 3–6 (+1 upgrades hidden in side rooms).

**Full game:** 15–25 rooms in 3–4 themed zones (levels/*.json room graph), 2–3 abilities, 3–5 health upgrades + secrets, 6+ enemy types (1–2 new per zone), 2–3 bosses guarding abilities/zones; 20–35 min first clear. `NK.save` at save rooms (Continue); final boss → escape + ending screen, `NK.gameOver({win:true, score})`; replay = % completion, best time. Slice (phase 1): menu + zone 1 (4–6 rooms) + first ability + map.

**Mobile:** `touch: { stick: "arrows", buttons: [{action:"jump"}, {action:"action"} /* attack */, {action:"dash"}] }`; locked buttons show a toast.

**Juice:** ability pickup = freeze 1 s, slow zoom, jingle, control toast; gate break particles; pooled dash afterimages; save glow + heal sound; boss name card.

**Mistakes:** abilities opening nothing seen; gates that look like walls; long backtracking without shortcuts; distant saves; no map; soft-locks (one-way drop into an area needing a missing ability).

**Assets:** `kenney/pixel-platformer` (+ `kenney/pixel-platformer-industrial-expansion`), `kenney/1-bit-platformer-pack`, `kenney/platformer-pack-industrial`, `kenney/platformer-assets-pixel`, `kenney/monochrome-pirates`, `kenney/minimap-pack` (map screen); sound `kenney/retro-sounds-1`, `kenney/sci-fi-sounds`.
