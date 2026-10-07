# Educational mini-games — phaser-2d (gravity 0 unless the game is a platformer)
**Loop:** short challenge on one skill → answer by playing (tap, drag, sort, catch, steer) → immediate feedback with the reason → adapt difficulty → mastery badge.
**Verbs:** tap the right item, drag-and-drop/sort, match pairs, type a number, catch falling answers, steer to the answer lane.

**Design rules:**
- State the learning goal in the menu subtitle ("Add numbers to 20"). One skill per mini-game.
- Rounds of 5–10 items, 2–4 min. Feedback < 0.2 s: right = chime + sparkle; wrong = gentle sound + show the right answer + one-line why. Never a harsh buzzer or a fail screen for kids.
- Adaptive: 3 right in a row → harder level; 2 wrong in a row → easier + a worked example. Keep accuracy near 70–85%.
- Missed items return later in the session (spaced repetition: after 2, then 5 items).
- Time pressure only as an opt-in "challenge" mode; default untimed.
- Age 5–8: targets ≥ 140 game px, ≤ 6 words of text, icons + voice/sound support, no reading needed to start; age 9+: targets ≥ 96 game px, text ≥ 32 game px.
- Content must be correct; generate math items from code (numbers via `NK.rng`), not hand-typed lists; words/facts in the game's language.

**Formats that work (pick one per game):**
- Catch: answers fall at 80–140 px/s, 3–4 lanes, the right one is caught by the basket.
- Sort: drag items into 2–4 bins (snap within 80 px, fly back if wrong).
- Memory pairs: 4×3 → 6×4 cards, flip 0.25 s, mismatch shows 0.8 s.
- Map tap: tap the country/region; zoom ≥ 2× for small ones.
- Runner/platformer: collect the correct answer item (see those cards for movement).

**Progression/win-lose:** stars per round (by accuracy), skill levels 1–5, badges via `NK.platform.achievements.unlock`; progress saved per skill (`NK.save`); result screen says "You learned: …".

**Mobile:** big direct-touch targets (`touch: { stick: false, buttons: [] }`) or the genre's controls; portrait OK; nothing important in the bottom corners.

**Juice:** friendly character reacts (happy/thinking), confetti on a perfect round (≤ 1 s), star fill animation, progress bar per round, number pops; calm music at 0.4.

**Mistakes:** quizzes dressed as games (play must carry the learning); punishing failure; walls of text; wrong answers rewarded by fun animations; difficulty not adapting; incorrect content; tiny targets for small hands.

**Assets:** `kenney/animal-pack-remastered`, `kenney/shape-characters`, `kenney/letter-tiles`, `kenney/flag-pack`, `kenney/map-pack`, `kenney/cartography-pack`, `kenney/ui-pack`, `kenney/medals`; sound `kenney/voiceover-pack`, `kenney/interface-sounds`, `kenney/music-jingles`.
