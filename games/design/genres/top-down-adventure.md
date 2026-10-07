# Top-down action/adventure (Zelda-like) — phaser-2d (gravity 0) or three-3d top-down
**Loop:** explore rooms → fight with a short-range attack → find key/item → open the gated door → boss → treasure.
**Verbs:** walk 8-way, attack, interact (talk/open/push), one item (bow, bomb or dash).

**Tuning** (T = tile px; 16 px sets at zoom 4, 64 px sets at zoom 1):
- `gravity: 0`. Walk 4–6 T/s (16 px: 64–96 px/s; 64 px: 256–384). Normalise diagonals. Accel 0.08 s, stop 0.06 s.
- Sword: reach 1–1.5 T in a 90–120° arc in front, active 0.12 s, cooldown 0.3 s, knock-back 2 T over 0.15 s.
- Hero: 3–6 hearts (half-heart hits), invulnerable 1 s after a hit.
- Enemies 2–3.5 T/s (≤ 60% of hero), 1–3 hits; wind-up ≥ 0.4 s (flash/crouch) before a charge or shot; projectiles 4–6 T/s.
- Drops: 20–30% heart chance when the hero is below half health.
- 3D (`camera: {mode:"top-down", offset:[0,12,9]}`): sample Crypt Run — speed 4.5, run 8, enemy chase 4.4 within 10 u, swing reach 1.5–1.9.

**Levels:**
- Rooms = one screen (20×11 tiles at 64 px; 16 px at zoom 4). Camera follows within the room or slides 0.3 s between rooms.
- Dungeon 6–12 rooms. Key before its door (check by BFS with the door shut); locked doors show a keyhole.
- Room 1: no enemies, a sign/prompt, a pot or bush to hit. Next: 1–2 weak enemies, then 3–5 mixed, then a puzzle room (push block, switch).
- Doors and exits read clearly (gap in the wall + floor marker). No dead-end without loot.
- Boss: 3 attack patterns, each telegraphed ≥ 0.6 s, a clear weak window of ≥ 1 s, 6–12 hits.

**Progression/win-lose:** hearts empty → respawn at room entrance with full hearts, keep keys; `NK.gameOver({win:false})` only after 3 lives or if a lives mode is chosen. Win = boss down + treasure. Track items in `NK.run`.

**Mobile:** `touch: { stick: "left", buttons: [{action:"action"} /* attack */, {action:"fire"} /* item */] }`; interact = context on the attack button near interactables (show the prompt).

**Juice:** swing trail/arc sprite; hit flash white 80 ms + knock-back + hit-stop 60 ms; enemy death poof; grass/pot breaks into particles + drop; door unlock sound + camera nudge; heart pickup bump.

**Mistakes:** enemies spawn on the room's entry tile; diagonal speed 1.41×; attack hitbox far bigger than the visual; keys behind their own door; walls that look walkable; HUD hearts under the stick.

**Assets:** `kenney/tiny-dungeon`, `kenney/tiny-town` (16 px, zoom 4), `kenney/roguelike-characters-pack` + `kenney/roguelike-dungeon-pack`, `kenney/micro-roguelike` (8 px, zoom 6), `kenney/rpg-tiles-vector` (64 px), `kenney/scribble-dungeons`, `kenney/monochrome-rpg-tileset`; 3D `kaykit/dungeon-pack` + `kaykit/adventurers` + `kaykit/skeletons`; sound `kenney/rpg-audio`, `kenney/impact-sounds`.
