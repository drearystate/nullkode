# Card and board games — phaser-2d (gravity 0, tweens); three-3d for a 3D table
**Loop:** your turn: pick a legal move → it animates → rules resolve → opponent/AI turn → repeat until a win condition.
**Verbs:** draw, play, drag, flip, roll, move piece, end turn, undo (solo games).

**Tuning** (1280×720):
- Cards ≥ 100×140 game px in hand (140×190 for the `kenney/boardgame-pack` cards at 0.75–1×); hand fans with 20–40 px overlap, the hovered/selected card lifts 30 px.
- Move tween 0.2–0.35 s ease-out; deal stagger 40–60 ms per card; flip = scaleX 1→0→1 over 0.25 s.
- AI "thinks" 0.4–0.8 s (show a dots indicator), never instantly; dice roll 0.6–0.9 s then settle.
- Drag: pick up on 8 px move, snap to the nearest legal target within 80 px, else fly back 0.2 s. Tap-to-select + tap-target works too.
- Board cells ≥ 96 game px on mobile; pieces ≥ 70% of a cell.

**Rules in code:**
- Rules engine is pure data + functions (state → legal moves → next state), separate from drawing; the UI only shows `legalMoves(state)`.
- Shuffle = Fisher-Yates with `NK.rng`; show/keep the seed for "replay this deal".
- Win/draw/stalemate checked after every move; solitaire: detect "no moves left" and offer undo/restart.
- AI levels: easy = random legal move with a 30% best-move chance; normal = 1-ply greedy; hard = 2–3 ply minimax / Monte Carlo 200 playouts, budget ≤ 50 ms per step (spread over frames).

**Content:**
- Rules screen (3–6 short lines + one picture) reachable from pause; first game shows legal moves highlighted.
- Highlight legal targets (outline + dot), last move (faded trail), whose turn (name + glow), not by colour alone.

**Progression/win-lose:** match = best of 1/3; scores and win streak saved (`NK.save`); stars for solitaire by moves/time. Lose = opponent wins → "Rematch" (1 tap).

**Mobile:** portrait works well for card games (`orientation:"portrait"`, 720×1280); hand at the bottom-centre (no stick/buttons: `touch: { stick: false, buttons: [] }`); action buttons ("End turn", "Draw") ≥ 96 game px above the hand.

**Juice:** card swish on move, soft thud on place, chip/coin clinks, dice clatter, win fanfare + cards cascade, illegal drop = 4 px shake + buzz, score counter roll.

**Mistakes:** rules enforced only in the UI; AI that cheats or freezes the frame; unreadable small cards on phones; no undo in solitaire; unclear turn owner; accidental drags firing on taps.

**Assets:** `kenney/boardgame-pack` (cards, chips, dice, pieces), `kenney/playing-cards-pack` (pixel), `kenney/board-game-icons`, `kenney/board-game-info`, `kenney/domino-pack`, `kenney/hexagon-pack` (hex boards); 3D `kaykit/board-game-bits`; sound `kenney/casino-audio`, `kenney/foley-sounds`.
