# Card and board games — phaser-2d (gravity 0, tweens); three-3d for a 3D table
**Loop:** pick a legal move → animate → rules resolve → AI turn → until a win.
**Verbs:** draw, play, drag, flip, roll, move piece, end turn, undo (solo).

**Tuning** (1280×720):
- Cards ≥ 100×140 game px in hand (`kenney/boardgame-pack` cards 140×190 at 0.75–1×); hand fans, 20–40 px overlap, selected card lifts 30 px.
- Move tween 0.2–0.35 s ease-out; deal stagger 40–60 ms; flip = scaleX 1→0→1, 0.25 s.
- AI "thinks" 0.4–0.8 s (dots), never instant; dice roll 0.6–0.9 s.
- Drag: lift after 8 px, snap to the nearest legal target within 80 px, else fly back 0.2 s; tap-select + tap-target too.
- Board cells ≥ 96 game px; pieces ≥ 70% of a cell.

**Rules in code:**
- Rules engine = pure data + functions (state → legal moves → next state), apart from drawing; UI only shows `legalMoves(state)`.
- Shuffle = Fisher-Yates with `NK.rng`; keep the seed for "replay this deal".
- Check win/draw/stalemate after every move; solitaire: detect "no moves left", offer undo/restart.
- AI levels: easy = random legal move, 30% best-move chance; normal = 1-ply greedy; hard = 2–3 ply minimax / Monte Carlo 200 playouts, ≤ 50 ms per step, spread over frames.

**Content:**
- Rules screen (3–6 lines + a picture) from pause; first game highlights legal moves.
- Show legal targets (outline + dot), last move (faded trail), whose turn (name + glow), not by colour alone.

**Progression/win-lose:** match = best of 1/3; solitaire stars by moves/time; lose → "Rematch" (1 tap).

**Full game:** 1 game with 3 AI levels (or 3+ variants) + a ladder of 8–12 named rivals of rising skill, some with a house-rule twist; 20–40 min. Solitaire: 3 variants or 30+ seeded deals + daily deal. `NK.save` ladder, stats, streak (Continue); champion beaten → ending screen, `NK.gameOver({win:true})`; replay = stats, stars, hard AI. Slice (phase 1): menu + rules screen + full rules engine + 2 rivals.

**Mobile:** portrait suits cards (`orientation:"portrait"`, 720×1280); hand bottom-centre; `touch: { stick: false, buttons: [] }`; "End turn"/"Draw" ≥ 96 game px above the hand.

**Juice:** card swish, thud on place, chip clinks, dice clatter, win fanfare + card cascade, illegal drop = 4 px shake + buzz, counter roll.

**Mistakes:** rules only in the UI; cheating or frame-freezing AI; tiny cards on phones; no solitaire undo; unclear turn; taps firing drags.

**Assets:** `kenney/boardgame-pack` (cards, chips, dice, pieces), `kenney/playing-cards-pack` (pixel), `kenney/board-game-icons`, `kenney/board-game-info`, `kenney/domino-pack`, `kenney/hexagon-pack` (hex boards); 3D `kaykit/board-game-bits`; sound `kenney/casino-audio`, `kenney/foley-sounds`.
