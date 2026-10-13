# Top-down action/adventure (Zelda-like) — phaser-2d (gravity 0) or three-3d top-down
**Loop:** explore rooms → melee fights → key/item → gated door → boss → treasure.
**Verbs:** walk 8-way, attack, interact (talk/open/push), items (bow, bomb, dash).

**Tuning** (T = tile px; 16 px sets zoom 4, 64 px zoom 1):
- Walk 4–6 T/s (16 px: 64–96 px/s; 64 px: 256–384). Normalise diagonals. Accel 0.08 s, stop 0.06 s.
- Sword: reach 1–1.5 T in a 90–120° front arc, active 0.12 s, cooldown 0.3 s, knock-back 2 T over 0.15 s.
- Hero 3–6 hearts (half-heart hits), 1 s invulnerable after a hit.
- Enemies 2–3.5 T/s (≤ 60% of hero), 1–3 hits; wind-up ≥ 0.4 s (flash/crouch) before charging/shooting; projectiles 4–6 T/s.
- Heart drops 20–30% below half health.
- 3D (`camera: {mode:"top-down", offset:[0,12,9]}`): sample Crypt Run — speed 4.5, run 8, enemy chase 4.4 within 10 u, swing reach 1.5–1.9.

**Levels:**
- Room = one screen (20×11 tiles at 64 px; 16 px at zoom 4); camera slides 0.3 s between rooms (or follows inside).
- Dungeon 6–12 rooms; key reachable with its door shut (BFS); locked doors show a keyhole.
- Room 1: no enemies, a sign, a pot/bush to hit; then 1–2 weak enemies, 3–5 mixed, a puzzle room (push block, switch).
- Exits = wall gap + floor marker; no dead end without loot.
- Boss: 3 patterns, each telegraphed ≥ 0.6 s; weak window ≥ 1 s; 6–12 hits.

**Progression/win-lose:** 0 hearts → room entrance, full hearts, keep keys; `NK.gameOver({win:false})` only in a 3-lives mode; items in `NK.run`.

**Full game:** overworld hub + 3–4 dungeons (levels/*.json), 20–35 min; 5–7 enemy types, 1–2 new per dungeon; each dungeon boss drops an item that opens new overworld paths, or +1 heart. Fight → puzzle → loot/breather. Map screen; `NK.save` per room (Continue); final boss + treasure → ending screen, `NK.gameOver({win:true})`; replay = items %, best time. Slice (phase 1): menu + overworld start + dungeon 1 with its boss.

**Mobile:** `touch: { stick: "left", buttons: [{action:"action"} /* attack */, {action:"fire"} /* item */] }`; attack button = interact near interactables (prompt).

**Juice:** swing arc; white hit flash 80 ms + hit-stop 60 ms; death poof; grass/pots burst + drop; door unlock sound + nudge; heart bump.

**Mistakes:** spawns on the entry tile; 1.41× diagonals; hitbox > visual; key behind its own door; walkable-looking walls; hearts under the stick.

**Assets:** `kenney/tiny-dungeon`, `kenney/tiny-town` (16 px, zoom 4), `kenney/roguelike-characters-pack` + `kenney/roguelike-dungeon-pack`, `kenney/micro-roguelike` (8 px, zoom 6), `kenney/rpg-tiles-vector` (64 px), `kenney/scribble-dungeons`, `kenney/monochrome-rpg-tileset`; 3D `kaykit/dungeon-pack` + `kaykit/adventurers` + `kaykit/skeletons`; sound `kenney/rpg-audio`, `kenney/impact-sounds`.
