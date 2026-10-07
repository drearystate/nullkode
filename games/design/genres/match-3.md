# Match-3 — phaser-2d (gravity 0, tweens not physics)
**Loop:** swap two neighbours → 3+ in a row clear → pieces fall + refill → cascades → hit the level goal within the move limit.
**Verbs:** swap (swipe or tap-tap), activate special, use booster.

**Tuning** (1280×720 landscape; portrait 720×1280 is fine for this genre):
- Board 7×7 to 8×8, cells 80–96 game px; 5 piece types early, 6 max. Each type differs in colour AND shape.
- Swap 0.15 s; invalid swap animates and swaps back 0.15 s. Clear 0.2 s (scale to 0 + particles). Fall 0.08 s per cell with ease-out bounce; refill drops from above the board.
- Cascade multiplier ×1, ×1.5, ×2…; combo label on cascades ≥ 3.
- Input locked only while the board resolves; queue at most 1 swap.
- Hint (gentle pulse on a valid pair) after 5 s idle.

**Rules in code:**
- Initial board has no matches and ≥ 3 valid moves (regenerate with `NK.rng`).
- After every resolve: if no valid move exists → reshuffle with a "No moves — shuffling" toast.
- Specials: 4 in a row → line clear; L/T → 3×3 bomb; 5 → colour bomb; special + special combos.
- Matching scans rows and columns once per resolve; resolve repeats until stable.

**Levels:**
- 20–30 moves per level; goals: score N, collect N of a type, clear blockers (ice/crates). One goal type in L1–3, a new blocker every 3–5 levels.
- Levels 1–3: forced first swap shown by a hand/arrow prompt; no failure possible in L1.
- Star thresholds at 1×, 1.5×, 2× the goal score.

**Progression/win-lose:** win = goal met → remaining moves become bonus specials ("sugar rush") → stars; lose = moves out → offer retry (1 tap). Level map with stars via `NK.save`; best score per level.

**Mobile:** swipe from a piece (≥ 30 px or 0.35 cell, whichever is less) or tap-tap; board centred, goal/moves HUD above the board; no `config.touch` buttons (`touch: { stick: false, buttons: [] }`).

**Juice:** squash on land, particles in the piece colour, score pops at the match centre, rising pitch per cascade step (rate 1.0 → 1.4), special creation flash, colour-bomb sweep, end-of-level counter roll-up.

**Mistakes:** colour-only pieces; dead boards; initial auto-matches; long locked animations (> 0.6 s per cascade step); swaps accepted mid-resolve corrupting the grid; random goals that can't be met.

**Assets:** `kenney/animal-pack-remastered` (round animals), `kenney/donuts`, `kenney/fish-pack`, `kenney/rune-pack`, `kenney/smilies`, `kenney/generic-items`; board backing `kenney/puzzle-pack-2`; UI `kenney/ui-pack`, `kenney/medals`; sound `kenney/interface-sounds`, `kenney/ui-audio`, `kenney/music-jingles`.
