# Fishing / farming / cosy sim (lite) — phaser-2d top-down or side (gravity 0); three-3d possible
**Loop:** farming: till → plant → water → wait → harvest → sell → buy seeds/upgrades. Fishing: cast → wait for a bite → hook → reel → collect/sell → better rod/spots.
**Verbs:** walk, use tool (context), plant, water, harvest, cast, hook, reel, sell, decorate.

**Tuning** (T = tile px; 16 px sets at zoom 4):
- Walk 4–5 T/s; tool use 0.3 s; tile under the cursor/facing highlighted.
- Crops: 3–4 growth stages, 30–120 s real time each (or 1–3 in-game days of 2–4 min); watered tiles darker + wet icon; unwatered crops pause, never die.
- Prices: seed cost × 1.5–3 = sell price; first upgrade affordable after 3–5 minutes.
- Fishing: cast power by hold time (0.2–1.2 s → 2–6 T), bite after 2–6 s random (`NK.rng`) with a ripple + "!" + sound; hook window 0.6–1.0 s (generous: 1.0 early); reel mini-game 3–8 s: keep the fish inside a bar zone; tension rises when out, line breaks only after 2 s out.
- Fish rarity common 70% / uncommon 25% / rare 5%; rare spots or times (night, rain) explained by an in-game note.

**Content:**
- No fail state, no timers that punish; weather and seasons are flavour.
- Start: a small plot of 3×3 tilled tiles + 5 seeds, a sell box, one fishing spot within 10 T.
- Collection log (fish/crops caught, sizes, first-catch dates) = the replay hook; 15–30 entries.
- Decor shop for the house/farm; daily small request ("bring 3 carrots") for direction.
- Gentle music loop, ambient birds/water; volume low (0.4).

**Progression/win-lose:** money, tools (watering can 1→3×3 area, rod tiers), farm size +3×3 per expansion; goals board ("earn 500", "catch 10 species"). Save on every harvest/catch/sale (`NK.save`); show "Saved" subtly.

**Mobile:** `touch: { stick: "left", buttons: [{action:"action"} /* use tool / cast */] }`; fishing: hold the action button to cast, tap to hook, hold to reel; tool switch via a hotbar at the top (≥ 96 game px slots).

**Juice:** soil puff on till, water splash, crop pop on harvest + item flying to the bag, coins jingle on sale, cast line arc + bobber plop, fish splash + size pop ("42 cm"), first-catch badge + jingle.

**Mistakes:** crops dying (stress); real-time waits with nothing else to do; hook windows < 0.5 s; tiny fish sprites; no direction for the player; aggressive shake or flashes in a calm game.

**Assets:** `kenney/tiny-farm`, `kenney/tiny-town`, `kenney/pixel-platformer-farm-expansion`, `kenney/isometric-miniature-farm`, `kenney/fish-pack`, `kenney/foliage-pack`, `kenney/animal-pack-remastered`; 3D `kaykit/forest-nature-pack`, `kaykit/resource-bits`, `kenney/watercraft-pack`; sound `kenney/foley-sounds`, `kenney/music-loops`.
