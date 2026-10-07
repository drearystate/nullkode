# Endless runner — phaser-2d side view; three-3d lane runner
**Loop:** auto-run → jump/slide/switch lane past obstacles → collect coins → speed rises → crash → instant retry.
**Verbs:** jump (hold = higher), slide or duck; 3D: lane left/right, jump, roll. Flappy variant: tap = flap.

**Tuning** (T = tile px):
- Start speed 6–8 T/s (64 px: 400–500 px/s); +4% per 10 s; cap 2× start. Move the world (or camera) — the hero stays at 25–30% screen width.
- Jump apex 2.5–3.5 T, ta 0.35–0.45 s (see platformer formulas), coyote 0.1 s, buffer 0.15 s.
- Obstacle gap ≥ speed × 0.9 s at start, ≥ speed × 0.55 s at cap. Obstacle width ≤ 0.6 × jump distance at the current speed.
- 3D lanes: 3 lanes, 2–2.5 u apart (KayKit scale), lane switch 0.15 s; speed 10 → 22 u/s; obstacles visible ≥ 1.5 s ahead (fog start beyond that).
- Flappy: tap sets vy = −(330–420) px/s, gravity 1200–1500; pipe gap ≥ 3.2× hero height early, ≥ 2.6× late; pipe spacing 300–400 px.

**Content:**
- First 5 s empty. Hand-authored chunks 10–20 T long, tagged easy/medium/hard; pick by distance with `NK.rng`, never the same chunk twice in a row.
- Each chunk is beatable at the cap speed (simulate the jump against its obstacles).
- Coins trace the safe line; risky lines pay 2×.
- Introduce obstacle types one at a time (low → tall → gap → flyer); combos after 60 s.

**Progression/win-lose:** score = distance (m) + coins; crash = `NK.gameOver({win:false, score})`, retry ≤ 1 s, skip the menu on retry. Meta: coins buy cosmetics/one-run boosts (`NK.save`). Missions ("jump 30 times") give goals.

**Mobile:** tap anywhere = jump (Phaser `pointerdown` on the play area; ignore taps in the HUD corner), swipe down = slide; 3D: swipe left/right/up/down (≥ 40 px, ≤ 0.3 s). Buttons via `config.touch` as an option.

**Juice:** dust trail at speed; squash on jump/land; coin pitch ladder; speed lines when > 1.5× start; near-miss "+5" pop; crash = hit-stop 120 ms + shake + slow-mo 0.3 s before the result.

**Mistakes:** obstacles appearing < 0.5 s before contact; speed ramp with no cap; chunks unbeatable at cap; jump that ignores early taps (no buffer); restart via 3 menus; same chunk repeated.

**Assets:** `kenney/new-platformer-pack`, `kenney/jumper-pack`, `kenney/tappy-plane`, `kenney/pixel-platformer`, `kenney/background-elements-remastered`; 3D `kaykit/platformer-pack`, `kenney/city-kit-roads` + `kenney/city-kit-suburban`, `kenney/mini-characters`; sound `kenney/digital-audio`, `kenney/impact-sounds`.
