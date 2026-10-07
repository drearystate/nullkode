# Survival / crafting (lite) — phaser-2d top-down (gravity 0) or three-3d
**Loop:** gather (chop, mine, pick) → craft tools/food → build a shelter/fire → survive the night's threats → explore further next day.
**Verbs:** move, gather/attack (one context button), craft, place/build, eat, open inventory.

**Tuning** (T = tile px in 2D; 3D: Kenney survival-kit ~1 u = 1 m):
- Walk 4–5 T/s (3D 4–5 u/s). Gather: 2–4 hits per node, 0.35 s per hit; node respawn 60–120 s.
- Meters 0–100: hunger −1 per 4–6 s (full lasts 6–10 min), health regen +1/2 s when fed > 50; warn at 25% (icon pulse + sound, not colour only); starving −1 health/3 s.
- Day 3–4 min, night 1.5–2 min; light radius 4–6 T around fire/torch; enemies only at night, ≤ 50% of player speed, spawn ≥ 10 T away outside light.
- Recipes 6–12, each 2–3 ingredients, crafted instantly with a sound; a new recipe every 1–3 min in the first 15 min.
- Inventory 8–16 slots, stacks 20–99; hotbar 4–6.

**World/content:**
- Map 60×60–120×120 tiles (or 150–300 u); start in a meadow with trees + rocks within 6 T; richer resources farther out.
- First 2 minutes: prompts for gather → craft axe → chop faster → campfire before night 1 (first night is mild).
- Biomes add one resource and one threat each; landmarks for navigation; optional minimap.
- Building: grid snap (1 T / 1–2 u), ghost preview valid/invalid with an icon; walls block enemies (re-check enemy paths).
- Goal for a lite game: survive N nights, or build/repair an escape (raft, beacon) from a recipe list shown up front.

**Progression/win-lose:** death → respawn at the shelter, drop half of the inventory there (no full wipe) or restart a run in hardcore mode; win = escape built / N nights. Save the world state every 30 s and on sleep (`NK.save`).

**Mobile:** `touch: { stick: "left", buttons: [{action:"action"} /* gather/attack */, {action:"fire"} /* use/eat */] }` + an inventory button in the top-right; craft menu with ≥ 96 game px slots; auto-target the nearest node within 1.5 T.

**Juice:** chips/wood particles + node shake per hit, node falls/breaks with a thud, items fly to the hotbar, craft sparkle + chime, day/night tint transition 10 s (no flash), fire flicker light, low-hunger stomach sound + icon.

**Mistakes:** meters that drain too fast (death in minute 3); grinding the same node 20 times; unexplained recipes; dark nights you can't see in; losing everything on death; inventory UI under the thumbs; empty huge maps.

**Assets:** 2D `kenney/tiny-town`, `kenney/tiny-farm`, `kenney/roguelike-city-pack`, `kenney/foliage-pack`, `kenney/generic-items` (items), `kenney/game-icons`; 3D `kenney/survival-kit`, `kaykit/resource-bits`, `kaykit/forest-nature-pack`, `kenney/nature-kit`; sound `kenney/foley-sounds`, `kenney/impact-sounds`, `kenney/rpg-audio`.
