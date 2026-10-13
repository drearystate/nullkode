# Word games (anagram, word search, guess-the-word, letter grid) — phaser-2d (gravity 0)
**Loop:** letters/clues → form a word (tap, drag, type) → instant validation → score → solve the board or beat the clock.
**Verbs:** select letters, drag a path, type, submit, shuffle, hint, backspace.

**Tuning:**
- Letter tiles ≥ 80 game px (≥ 96 on phones), 8–12 px gaps; selected path = thick line.
- Validate on submit/drag release < 50 ms; found word flies to the list in 0.3 s.
- Guess-the-word (5 letters, 6 tries): reveal letters one by one 0.25 s; states = right spot / in word / absent, with shapes or symbols, not only colour.
- Anagram: 6–7 letters, 8–20 findable words of 3+ letters; word search: 8×8–12×12 grid, 6–12 words, all 8 directions only on hard.
- Scoring: letters × length bonus (3=1×, 5=2×, 7+=3×); hints cost points or are limited (3 per level).

**Content / dictionary:**
- Ship a word list as data (`NK.def("words", ...)`), lower-case, 3–8 letters, common words only, ≤ 10k entries; a separate small "answers" list of well-known words.
- Dictionary in the GAME's language; tiles must support its alphabet (accents; RTL needs its own layout).
- Generate puzzles from a chosen answer word so every board is solvable; precompute all valid words for the board and show the count ("7 / 15").
- No offensive words in answers or boards (filter list).
- Daily puzzle = seeded by date with `NK.rng`.

**Progression/win-lose:** stars by hints used/time; guess-the-word: win in ≤ 6 tries, streak saved; timed mode ends at 0 → `NK.gameOver({win, score})`.

**Full game:** 30–60 levels (generated from answer words with seeded `NK.rng`, saved as levels/*.json) in 4–6 themed packs that grow 4 → 7 letters and add a twist each (bonus words, timer, hidden letters) + a daily puzzle; 20–40 min; an easy level after each hard one. Pack map with stars, `NK.save` (Continue); last pack → ending screen; replay = stars, daily streak. Slice (phase 1): menu + pack 1 levels 1–5.

**Mobile:** drag or tap tiles; on-screen keyboard for typing games (rows ≥ 96 game px, portrait 720×1280); `touch: { stick: false, buttons: [] }`; physical keyboard works too.

**Juice:** tile bounce, path follows the finger, valid = tiles flash + chime pitched by length + score pop, already found = soft blip, invalid = 4 px shake + thud (red outline with reduce motion), board done = confetti + jingle.

**Mistakes:** obscure answers; wrong-language dictionary; unsolvable boards; silent invalid words; tiny letters; colour-only clue states; keyboard under thumbs or HUD.

**Assets:** `kenney/letter-tiles`, `kenney/letter-tiles-redux`, `kenney/ui-pack`, `kenney/fonts`, `kenney/game-icons`; sound `kenney/interface-sounds`, `kenney/ui-audio`, `kenney/music-jingles`.
