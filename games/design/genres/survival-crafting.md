# Survival / crafting (lite) — phaser-2d top-down (gravity 0) or three-3d
**Loop:** gather → craft tools/food → build shelter/fire → survive the night → explore further.
**Verbs:** move, gather/attack (one context button), craft, place/build, eat, inventory.

**Tuning** (T = tile px in 2D; 3D: Kenney survival-kit ~1 u = 1 m):
- Walk 4–5 T/s (3D 4–5 u/s). Gather: 2–4 hits per node, 0.35 s per hit; node respawn 60–120 s.
- Meters 0–100: hunger −1 per 4–6 s (full lasts 6–10 min), health regen +1/2 s when fed > 50; warn at 25% (icon pulse + sound, not colour only); starving −1 health/3 s.
- Day 3–4 min, night 1.5–2 min; light radius 4–6 T around fire/torch; enemies only at night, ≤ 50% of player speed, spawn ≥ 10 T away outside light.
- Recipes 6–12, each 2–3 ingredients, crafted instantly + sound; a new recipe every 1–3 min in the first 15 min.
- Inventory 8–16 slots, stacks 20–99; hotbar 4–6.

**World/content:**
- Map 60×60–120×120 tiles (or 150–300 u); start in a meadow with trees + rocks within 6 T; richer farther out.
- First 2 min: prompts gather → craft axe → chop faster → campfire before night 1 (mild).
- Each biome adds a resource + a threat; landmarks; optional minimap.
- Building: grid snap (1 T / 1–2 u), ghost preview, valid/invalid icon; walls block enemies (re-check enemy paths).

**Progression/win-lose:** death → respawn at the shelter, half the inventory dropped there (hardcore: restart). Save the world every 30 s and on sleep (`NK.save`).

**Full game:** 3 tech tiers (stone → copper → iron; each a workbench upgrade + 3–4 recipes), 2–3 biomes opened by tier tools, 5–10 nights of rising threat (a raid ~night 5), and a final goal (raft, beacon) listed up front; 30–60 min. Continue button; goal built → ending screen, `NK.gameOver({win:true})`; replay = days survived, hardcore. Slice (phase 1): menu + day 1 → night 1 (gather, craft, campfire).

**Mobile:** `touch: { stick: "left", buttons: [{action:"action"} /* gather/attack */, {action:"fire"} /* use/eat */] }` + inventory button top-right; craft slots ≥ 96 game px; auto-target the nearest node within 1.5 T.

**Juice:** chips + node shake per hit, break thud, items fly to the hotbar, craft sparkle + chime, 10 s day/night tint (no flash), fire flicker, hunger growl + icon.

**Mistakes:** meters draining too fast (dead by minute 3); 20-hit grinds; unexplained recipes; pitch-dark nights; losing everything on death; inventory under the thumbs; huge empty maps.

**Assets:** 2D `kenney/tiny-town`, `kenney/tiny-farm`, `kenney/roguelike-city-pack`, `kenney/foliage-pack`, `kenney/generic-items` (items), `kenney/game-icons`; 3D `kenney/survival-kit`, `kaykit/resource-bits`, `kaykit/forest-nature-pack`, `kenney/nature-kit`; sound `kenney/foley-sounds`, `kenney/impact-sounds`, `kenney/rpg-audio`.
