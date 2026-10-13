# Fishing / farming / cosy sim (lite) — phaser-2d top-down or side (gravity 0); three-3d possible
**Loop:** farm: till → plant → water → harvest → sell → buy seeds/upgrades. Fish: cast → bite → hook → reel → sell → better rod/spots.
**Verbs:** walk, use tool (context), plant, water, harvest, cast, hook, reel, sell, decorate.

**Tuning** (T = tile px; 16 px sets at zoom 4):
- Walk 4–5 T/s; tool use 0.3 s; highlight the target tile.
- Crops: 3–4 stages, 30–120 s each (or 1–3 in-game days of 2–4 min); watered = darker + wet icon; unwatered pause, never die.
- Sell = seed cost × 1.5–3; first upgrade after 3–5 min.
- Fishing: cast power by hold time (0.2–1.2 s → 2–6 T), bite after 2–6 s random (`NK.rng`) with ripple + "!" + sound; hook window 0.6–1.0 s (1.0 early); reel 3–8 s: keep the fish in a bar zone; tension rises outside, line breaks only after 2 s out.
- Fish rarity common 70% / uncommon 25% / rare 5%; rare spots/times (night, rain) hinted by an in-game note.

**Content:**
- No fail state or punishing timers.
- Start: 3×3 tilled tiles + 5 seeds, a sell box, a fishing spot within 10 T.
- Collection log (fish/crops, sizes, first-catch dates) = replay hook; 15–30 entries.
- Decor shop; daily request ("bring 3 carrots") for direction.
- Gentle music + ambient birds/water at volume 0.4.

**Progression/win-lose:** money, tools (watering can 1→3×3 area, rod tiers), farm +3×3 per expansion. Save on every harvest/catch/sale (`NK.save`); show "Saved" subtly.

**Full game:** 4 seasons (12–20 in-game days, 30–60 min) and a goals board of 12+ goals (earn 500, catch 10 species, fix the bridge), each unlocking something: seasonal crops, 2–3 fishing spots, tool tiers, 2 farm expansions, a shop/NPC; something new every 5–10 min. Continue from `NK.save`; last goal → festival ending scene, play continues; replay = finish the log, decor. Slice (phase 1): menu + farm and fishing loop with the first 3 goals.

**Mobile:** `touch: { stick: "left", buttons: [{action:"action"} /* use tool / cast */] }`; fishing: hold action to cast, tap to hook, hold to reel; tool hotbar at the top (≥ 96 game px slots).

**Juice:** soil puff, water splash, crop pop + item flies to the bag, coin jingle, cast arc + bobber plop, fish splash + size pop ("42 cm"), first-catch badge.

**Mistakes:** crops dying; idle real-time waits; hook windows < 0.5 s; tiny fish sprites; no direction; harsh shake/flashes.

**Assets:** `kenney/tiny-farm`, `kenney/tiny-town`, `kenney/pixel-platformer-farm-expansion`, `kenney/isometric-miniature-farm`, `kenney/fish-pack`, `kenney/foliage-pack`, `kenney/animal-pack-remastered`; 3D `kaykit/forest-nature-pack`, `kaykit/resource-bits`, `kenney/watercraft-pack`; sound `kenney/foley-sounds`, `kenney/music-loops`.
