# Word games (anagram, word search, guess-the-word, letter grid) — phaser-2d (gravity 0)
**Loop:** see letters/clues → form a word (tap, drag through, type) → validate instantly → score/progress → solve the board or beat the clock.
**Verbs:** select letters, drag a path, type, submit, shuffle, hint, backspace.

**Tuning:**
- Letter tiles ≥ 80 game px (≥ 96 when tapped on phones), 8–12 px gaps; selected path drawn as a thick line.
- Validation on submit (or on release of a drag) < 50 ms; accepted word flies to the found list in 0.3 s.
- Guess-the-word (5 letters, 6 tries): reveal letters one by one 0.25 s; states = correct position / in word / absent with distinct shapes or symbols, not only green/yellow/grey.
- Anagram: 6–7 letters, 8–20 findable words of 3+ letters; word search: 8×8–12×12 grid, 6–12 words, all 8 directions only on hard.
- Scoring: letters × length bonus (3=1×, 5=2×, 7+=3×); hints cost points or are limited (3 per level).

**Content / dictionary:**
- Ship a word list as data (`NK.def("words", ...)`), lower-case, 3–8 letters, common words only, ≤ 10k entries; a separate small "answers" list of well-known words.
- The dictionary is in the GAME's language; letters and tile art must support that alphabet (accents; RTL scripts need their own layout).
- Generate puzzles from a chosen answer word so every board is solvable; precompute all valid words for the board and show the count ("7 / 15").
- No offensive words in answers or boards (filter list).
- Daily puzzle = seeded by date with `NK.rng`.

**Progression/win-lose:** levels unlock by solving; stars by hints used/time; guess-the-word: win in ≤ 6 tries, streak saved; timed mode ends at 0 with the result (`NK.gameOver({win, score})`).

**Mobile:** drag through tiles or tap; on-screen letter keyboard for typing games (rows ≥ 96 game px tall, portrait 720×1280 recommended); `touch: { stick: false, buttons: [] }`; physical keyboard works too.

**Juice:** tile press bounce, path line follows the finger, valid word = tiles flash + chime with pitch by length + score pop, already-found = soft blip, invalid = 4 px shake + thud (red outline instead with reduce motion), board-complete confetti + jingle.

**Mistakes:** rare/obscure answers; dictionary in the wrong language; unsolvable boards; invalid words with no feedback; letters too small; colour-only clue states; keyboard hidden behind the thumbs or the HUD.

**Assets:** `kenney/letter-tiles`, `kenney/letter-tiles-redux`, `kenney/ui-pack`, `kenney/fonts`, `kenney/game-icons`; sound `kenney/interface-sounds`, `kenney/ui-audio`, `kenney/music-jingles`.
