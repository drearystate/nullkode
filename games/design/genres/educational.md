# Educational mini-games — phaser-2d (gravity 0 unless platformer)
**Loop:** challenge on one skill → answer by playing (tap, drag, sort, catch, steer) → instant feedback + reason → adapt difficulty → mastery badge.
**Verbs:** tap the right item, drag-and-drop/sort, match pairs, type a number, catch falling answers, steer to the answer lane.

**Design rules:**
- Learning goal in the menu subtitle ("Add numbers to 20"); one skill per mini-game.
- Rounds of 5–10 items, 2–4 min. Feedback < 0.2 s: right = chime + sparkle; wrong = gentle sound + right answer + one-line why; never a harsh buzzer or fail screen.
- Adaptive: 3 right in a row → harder; 2 wrong → easier + a worked example; target 70–85% accuracy.
- Missed items return (spaced: after 2, then 5 items).
- Time pressure only as an opt-in "challenge" mode; default untimed.
- Age 5–8: targets ≥ 140 game px, ≤ 6 words, icons + voice, no reading needed to start; age 9+: targets ≥ 96 game px, text ≥ 32 game px.
- Content correct; generate math items in code (`NK.rng`), not hand-typed; words/facts in the game's language.

**Formats (one per topic):**
- Catch: answers fall at 80–140 px/s, 3–4 lanes, catch the right one in the basket.
- Sort: drag items into 2–4 bins (snap within 80 px, fly back if wrong).
- Memory pairs: 4×3 → 6×4 cards, flip 0.25 s, mismatch shows 0.8 s.
- Map tap: country/region; zoom ≥ 2× for small ones.
- Runner/platformer: collect the correct answer (movement from those cards).

**Progression/win-lose:** stars per round (accuracy), skill levels 1–5, badges via `NK.platform.achievements.unlock`; result screen says "You learned: …".

**Full game:** 5+ topics (e.g. adding, subtracting, times tables, shapes, money), each its own mini-game, × 3 difficulty levels = 15+ rounds, 20–40 min; a review round of old items after each topic. Topic map with stars, per-skill progress in `NK.save` (Continue); all topics passed → certificate/ending screen; replay = 3 stars, challenge mode. Slice (phase 1): menu + topic 1 at all 3 levels.

**Mobile:** big direct-touch targets (`touch: { stick: false, buttons: [] }`) or the genre's controls; portrait OK; nothing key in the bottom corners.

**Juice:** friendly character reacts (happy/thinking), perfect round = confetti ≤ 1 s, star fill, round progress bar, number pops; calm music at 0.4.

**Mistakes:** quizzes dressed as games (play must carry the learning); punishing failure; walls of text; fun animations for wrong answers; no adaptation; incorrect content; tiny targets.

**Assets:** `kenney/animal-pack-remastered`, `kenney/shape-characters`, `kenney/letter-tiles`, `kenney/flag-pack`, `kenney/map-pack`, `kenney/cartography-pack`, `kenney/ui-pack`, `kenney/medals`; sound `kenney/voiceover-pack`, `kenney/interface-sounds`, `kenney/music-jingles`.
