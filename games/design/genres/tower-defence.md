# Tower defence — phaser-2d (gravity 0) top-down; three-3d with a fixed/top-down camera
**Loop:** build towers with gold → wave walks the path → towers kill → earn gold → upgrade/build → harder wave.
**Verbs:** place, upgrade, sell (70% refund), target mode, start next wave early (bonus gold), speed ×2.

**Tuning** (T = tile px; 64 px sets → 20×11 grid at 1280×720):
- Path length 30–60 T; enemies 1–2.5 T/s (fast type ≤ 3.5); spacing 0.6–1.2 s.
- Towers: range 2–4 T, fire 0.5–2 shots/s, projectile 8–12 T/s (or instant hitscan for lasers). Show the range circle on hover/select.
- 3–5 tower roles: single-target, splash, slow (−40% for 2 s), long-range, anti-air. Each counters a specific enemy type.
- Enemy HP +12–15% per wave; armour/flying types from wave 4+.
- Start gold = 2 basic towers; wave 1 beatable by them without upgrades; kill gold ≈ 5–10% of a tower cost.
- Upgrade 2 levels: +40–60% damage, +10% range, cost 1.5× then 2×.
- Lives 20; a leak costs 1 (boss 5).

**Levels:**
- 10–20 waves, each 20–40 s; build phase 10–15 s or "Next wave" button; wave preview (icons + count) before it starts.
- Path visible and readable; build tiles marked; path never placeable. Mazing maps: BFS from spawn to base after each placement — reject a placement that blocks the path.
- Map 1 one path; map 2 a fork; map 3 two spawns. Introduce one enemy type per 2–3 waves, with a toast showing its icon + weakness.
- Boss wave every 5 waves.

**Progression/win-lose:** lose at 0 lives (`NK.gameOver({win:false, score})`); win = all waves; stars by lives left (20/15/1). Map unlocks via `NK.save`.

**Mobile:** tap a build tile → radial/side menu of towers with cost; buttons ≥ 96 game px; confirm by a second tap (ghost tower + range preview, green/red plus a check/cross icon, not colour only). No `config.touch` stick.

**Juice:** tower recoil + muzzle flash, projectile trails, enemy hit flash + HP bar (only when damaged), coins fly to the HUD on kill, leak = red edge flash + base shake (small), wave-start horn, upgrade sparkle.

**Mistakes:** unreadable path; gold so tight wave 1 leaks; towers that can't hit flyers with no hint; range shown nowhere; enemies stacking into one sprite; no fast-forward; UI covering the map's lower corners.

**Assets:** `kenney/tower-defense` (64 px tiles, top-down), `kenney/isometric-tower-defense`, `kenney/rts-medieval`, `kenney/rts-sci-fi`, `kenney/explosion-pack`; 3D `kenney/tower-defense-kit`, `kenney/tower-defense-classic`; sound `kenney/impact-sounds`, `kenney/sci-fi-sounds`; UI `kenney/ui-pack`.
