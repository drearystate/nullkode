# Quiz / trivia — phaser-2d (gravity 0, UI only)
**Loop:** read a question → pick an answer before the timer ends → instant right/wrong feedback → streak/score → next question → round result.
**Verbs:** choose answer, use a lifeline (50:50, skip, extra time), continue.

**Tuning** (1280×720 or portrait 720×1280):
- Round = 10 questions (3–5 min). Timer 10–20 s per question as a shrinking bar + number; last 3 s tick sound + bar pulse.
- 4 answer buttons, full-width or 2×2, ≥ 96 game px tall (≥ 120 on portrait), text ≥ 32 game px, ≤ 2 lines; question text ≥ 36 game px, ≤ 4 lines (shrink-to-fit, never cut off).
- Feedback within 0.1 s: chosen answer green + check icon or red + cross icon, correct answer always revealed; 1.2–1.8 s pause then next (tap to skip the pause).
- Score: 100 per correct + time bonus (up to +50 by remaining time) × streak multiplier (×1, ×1.5 at 3, ×2 at 5).
- Lifelines: 1 each per round.

**Content:**
- Question bank as data (`NK.def("questions", [...])`): `{q, answers:[correct, ...wrong], cat, difficulty 1–3, explain}`; ≥ 3× the round size per category so rounds don't repeat.
- Shuffle questions and answer order with `NK.rng`; no repeats within a session (track asked ids in `NK.run`).
- Facts must be correct and timeless (no "current" records/prices); prefer questions whose answers don't change. The written questions are in the game's language.
- Difficulty ramp inside a round: 3 easy → 4 medium → 3 hard; wrong distractors plausible but clearly wrong.
- Optional one-line explanation after a wrong answer (learning value).

**Progression/win-lose:** round result: correct x/10, score, best streak, stars (5/7/9 correct); categories unlock or a "daily 5" (seed by date) for replay; best per category saved. No game over mid-round; optional "3 lives" mode.

**Mobile:** buttons are the controls (`touch: { stick: false, buttons: [] }`); keyboard 1–4 / A–D; answer buttons in the lower half, question at the top.

**Juice:** button press scale 0.95; correct = chime + sparkle + score pop flying to the total; wrong = low buzz + small 4 px shake on the button (skip with reduce motion); streak flame/badge; result screen counts up; jingle by stars.

**Mistakes:** wrong or ambiguous facts; text overflow on phones; colour-only right/wrong; timers so short you can't read; repeated questions; answer always in the same position; no reveal of the right answer.

**Assets:** `kenney/ui-pack`, `kenney/ui-pack-sci-fi`, `kenney/game-icons`, `kenney/medals`, `kenney/fonts`, `kenney/flag-pack` (geography rounds); sound `kenney/interface-sounds`, `kenney/ui-audio`, `kenney/music-jingles`, `kenney/voiceover-pack`.
