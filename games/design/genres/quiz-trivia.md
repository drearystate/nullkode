# Quiz / trivia — phaser-2d (gravity 0, UI only)
**Loop:** read → answer before the timer ends → instant right/wrong → streak/score → next → round result.
**Verbs:** choose answer, use a lifeline (50:50, skip, extra time), continue.

**Tuning** (1280×720 or portrait 720×1280):
- Round = 10 questions (3–5 min). Timer 10–20 s (shrinking bar + number); last 3 s tick + pulse.
- 4 answer buttons, full-width or 2×2, ≥ 96 game px tall (≥ 120 on portrait), text ≥ 32 game px, ≤ 2 lines; question text ≥ 36 game px, ≤ 4 lines (shrink-to-fit, never cut off).
- Feedback < 0.1 s: chosen answer green + check or red + cross, correct one always revealed; 1.2–1.8 s pause (tap skips).
- Score: 100 per correct + time bonus (up to +50 by remaining time) × streak multiplier (×1, ×1.5 at 3, ×2 at 5).
- Lifelines: 1 each per round.

**Content:**
- Question bank as data (`NK.def("questions", [...])`): `{q, answers:[correct, ...wrong], cat, difficulty 1–3, explain}`; ≥ 3× the round size per category so rounds don't repeat.
- Shuffle questions and answer order with `NK.rng`; no repeats within a session (track asked ids in `NK.run`).
- Facts correct and timeless (no "current" records/prices); questions in the game's language.
- Difficulty ramp inside a round: 3 easy → 4 medium → 3 hard; wrong distractors plausible but clearly wrong.
- One-line `explain` after a wrong answer.

**Progression/win-lose:** round result: correct x/10, score, best streak, stars (5/7/9 correct). No game over mid-round; optional "3 lives" mode.

**Full game:** 8+ categories × 30+ questions (240+ in data, difficulty 1–3) as a ladder of 8–12 rounds (one per category, mixed rounds, a harder final round); 20–40 min; lifelines refill every 3 rounds. Category map with stars, `NK.save` (Continue); final round passed → ending screen, `NK.gameOver({win:true, score})`; replay = stars, best streak, daily 5 (seeded by date). Slice (phase 1): menu + 2 categories (60 questions) with full rounds and results.

**Mobile:** buttons are the controls (`touch: { stick: false, buttons: [] }`); keyboard 1–4 / A–D; answer buttons in the lower half, question at the top.

**Juice:** press scale 0.95; correct = chime + sparkle + score pop to the total; wrong = low buzz + 4 px button shake (not with reduce motion); streak badge; result counts up; jingle by stars.

**Mistakes:** wrong/ambiguous facts; text overflow on phones; colour-only right/wrong; timers too short to read; repeats; correct answer always in one slot; no reveal.

**Assets:** `kenney/ui-pack`, `kenney/ui-pack-sci-fi`, `kenney/game-icons`, `kenney/medals`, `kenney/fonts`, `kenney/flag-pack` (geography rounds); sound `kenney/interface-sounds`, `kenney/ui-audio`, `kenney/music-jingles`, `kenney/voiceover-pack`.
