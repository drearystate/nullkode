# Roguelite (lite) — phaser-2d top-down (gravity 0); three-3d top-down possible
**Loop:** start a run → clear a room → pick 1 of 3 upgrades → next room → floor boss → die or win → spend meta-currency → new run.
**Verbs:** move, attack (melee or shot), dash, use item; between rooms: choose.

**Tuning:** movement/combat from the top-down adventure or twin-stick card. Run structure:
- Run 10–20 min: 3 floors × 5–8 rooms + boss; a room takes 20–60 s.
- Enemies per room 3–8 (floor 1) → 6–14 (floor 3); HP +25% per floor; new enemy types per floor.
- Hero health 4–6 hearts; heal room or shop once per floor.
- Upgrades: +10–25% stat, or a new behaviour (pierce, split, orbit, lifesteal). 3 choices, no duplicates of a maxed item; one rare (≤ 15%) in each choice.
- Meta-currency: 20–60 per run; unlocks (new upgrades in the pool, starting perks) cost 50–300 → a new unlock every 1–3 runs. Meta never exceeds ~30% power so skill still matters.
- Seeded runs: `NK.rng` seeded per run; show the seed on the result screen.

**Rooms:**
- Hand-authored room templates (8–20), shuffled per floor; doors lock during combat and open with a sound when clear.
- Generator guarantees: a path from start to boss (BFS over the room graph), ≥ 1 shop/heal per floor, no room repeated twice in a row.
- Spawn enemies ≥ 4 T from the entry door with a 0.6 s spawn marker; first room of a run is easy.
- Room exits show what's behind them (icon: fight, shop, treasure, boss).

**Progression/win-lose:** death → result screen (time, rooms, kills, upgrades, meta earned) → "Run again" (1 tap, ≤ 1 s). Win = floor-3 boss. Best floor/time and unlocks saved.

**Mobile:** `touch: { stick: "left", buttons: [{action:"action"}, {action:"dash"}] }`; auto-aim for ranged attacks; upgrade cards as big buttons (≥ 200 × 280 game px).

**Juice:** upgrade cards flip in one by one; rare cards glow (+ "Rare" label); door slam/open; room-clear chime + loot pop; hit-stop on kills of big enemies; boss health bar; death slow-mo 0.5 s.

**Mistakes:** runs decided by RNG in the first room; upgrades that are pure +1%; no visible build (show icons of owned upgrades); meta-progression that's mandatory; spawns on the door; runs over 30 min.

**Assets:** `kenney/tiny-dungeon`, `kenney/micro-roguelike`, `kenney/roguelike-characters-pack`, `kenney/roguelike-dungeon-pack`, `kenney/scribble-dungeons`, `kenney/game-icons` (upgrade icons); 3D `kaykit/dungeon-pack` + `kaykit/skeletons` + `kaykit/fantasy-weapons-bits`; sound `kenney/rpg-audio`, `kenney/impact-sounds`.
