# Match-3 — phaser-2d (gravity 0, tweens not physics)
**Loop:** swap two neighbours → 3+ in a row clear → pieces fall + refill → cascades → hit the level goal within the move limit.
**Verbs:** swap (swipe or tap-tap), activate special, use booster.

**Tuning** (1280×720; portrait 720×1280 fine):
- Board 7×7 to 8×8, cells 80–96 game px; 5 piece types early, 6 max. Each type differs in colour AND shape.
- Swap 0.15 s; invalid swap bounces back 0.15 s. Clear 0.2 s (scale to 0 + particles). Fall 0.08 s per cell with ease-out bounce; refill drops from above the board.
- Cascade multiplier ×1, ×1.5, ×2…; combo label on cascades ≥ 3.
- Input locked only while the board resolves; queue at most 1 swap.
- Hint (gentle pulse on a valid pair) after 5 s idle.

**Rules in code:**
- Initial board has no matches and ≥ 3 valid moves (regenerate with `NK.rng`).
- No valid move after a resolve → reshuffle + "No moves — shuffling" toast.
- Specials: 4 in a row → line clear; L/T → 3×3 bomb; 5 → colour bomb; special + special combos.
- Matching scans rows and columns once per resolve; resolve repeats until stable.

**Levels:**
- 20–30 moves per level; goals: score N, collect N of a type, clear blockers (ice/crates); one goal type in L1–3.
- L1–3: forced first swap shown by a hand/arrow; L1 can't fail.
- Star thresholds at 1×, 1.5×, 2× the goal score.

**Progression/win-lose:** win = goal met → remaining moves become bonus specials ("sugar rush") → stars; lose = moves out → offer retry (1 tap). Best score per level.

**Full game:** 30–40 levels (levels/*.json: board mask, moves, goal, blockers) on a level map in 3–4 episodes; 30+ min. A new blocker, goal type or special every 3–5 levels (teach → test → twist), an easier level after each hard one, a tough showpiece level ends each episode. Map progress + stars in `NK.save` (Continue); ending screen after the last level; replay = 3 stars, best score. Slice (phase 1): menu + map + levels 1–5 complete.

**Mobile:** swipe from a piece (≥ 30 px or 0.35 cell, whichever is less) or tap-tap; board centred, goal/moves HUD above it; `touch: { stick: false, buttons: [] }`.

**Juice:** squash on land, piece-colour particles, score pops at the match centre, pitch rising per cascade (rate 1.0 → 1.4), special creation flash, colour-bomb sweep, counter roll-up.

**Mistakes:** colour-only pieces; dead boards; initial matches; locked animations > 0.6 s per cascade step; swaps mid-resolve corrupting the grid; unmeetable goals.

**Assets:** `kenney/animal-pack-remastered` (round animals), `kenney/donuts`, `kenney/fish-pack`, `kenney/rune-pack`, `kenney/smilies`, `kenney/generic-items`; board backing `kenney/puzzle-pack-2`; UI `kenney/ui-pack`, `kenney/medals`; sound `kenney/interface-sounds`, `kenney/ui-audio`, `kenney/music-jingles`.
