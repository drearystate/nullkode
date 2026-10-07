# CORE RULES (every game, every step)
Units: 2D = game px at 1280×720; T = tile px (speeds in tiles/s × T). 3D = asset units (KayKit floor 4, hero h ≈ 2.5). Logic in `fixedUpdate(dt)`, timers in seconds, never frame counts.

## Feel
- Coyote time 0.1 s, jump buffer 0.12 s, variable jump (release cuts rise; short hop 30–45% of full). 3D `NK3D.character` has none: add them in the hero's own fixedUpdate.
- Full speed in 0.08–0.15 s, stop in 0.05–0.12 s, air control 50–80%. Lerp velocity, no 0→max snaps, no ice unless it's the mechanic.
- Cap fall speed ≈ 1.3× jump speed and < 0.8·T·60 px/s (no tunnelling). Optional fall gravity 1.3–2×.
- Input acts the same step. Attack startup ≤ 0.1 s unless it's a telegraphed heavy.
- Camera follow lerp 0.1–0.2 + deadzone; the player and the next landing are always on screen.

## Readability
- Player contrast ≥ 3:1 vs nearby background, unique colour + silhouette, depth above props. Hero on screen = 1/12–1/6 of view height. Pixel art: `pixelArt: true` + camera zoom so a tile shows ≥ 48 px (18 px tiles → zoom 3).
- Telegraph every enemy attack ≥ 0.4 s (wind-up, flash, marker). Damage hitboxes ≤ 85% of sprite; pickup hitboxes ≥ sprite.
- One visual language: danger = red/spiky/animated, pickups = bright + spinning/bobbing, interactables = outline or prompt. Decor never looks like danger. Backgrounds darker/desaturated, parallax ≤ 0.5.

## Feedback
- Every action has sound + visual: move start, jump, land, hit, pickup, hurt, death, win, UI click.
- Hit-stop 50–100 ms on strong hits and kills (2D: `this.physics.world.pause()` + `this.time.delayedCall(70, …resume())`, skip logic meanwhile). Shake ≤ 200 ms, ≤ 0.01, big events only, never during precise input.
- Particle burst ≤ 20, life ≤ 0.6 s. Score pop "+10" rises 40 px over 0.5 s. HUD values bump. Hurt = knock-back + 1–1.6 s blink.

## Difficulty and pacing
- Safe start: no threat within 6 tiles (8 m in 3D) of spawn; the first 5 s can't kill.
- Teach → test → twist: a new mechanic alone and safe first, then with risk, then combined. One new thing per section.
- No blind jumps or leaps of faith: landing visible before the jump. No off-screen or unwarned instant death.
- Early gaps ≤ 70% of max jump distance, ledges ≤ 80% of max height. Early enemies ≤ 60% of player speed.
- Checkpoint every 30–60 s of play; respawn ≤ 1 s at a safe spot.
- No soft-locks: the goal is reachable from every reachable place, else a kill-plane or restart exists.
- Ramp per level (speed, density, combos), then a breather.

## Onboarding
Learn by doing, no text walls. A prompt (≤ 6 words) appears when a mechanic first matters, names the key for `NK.input.lastDevice` ("Space" / "tap the jump button"), and hides after first use.

## UI/UX
- Use the kit flow only: Menu (title, subtitle), pause (Esc/P), settings (volume, mute), `NK.gameOver({win, score})` = result + best + retry.
- Reduce motion: if `NK.settings.get("reduceMotion")`, no shake, flashes or parallax.
- HUD ≤ 4 items in top corners; 2D text ≥ 24 game px.

## Mobile
- Always set `config.touch`: stick/arrows bottom-left, main action biggest bottom-right, ≤ 3 buttons.
- In-canvas tap targets ≥ 96 game px (≈ 52 CSS px on a 390 px phone), 16 px apart.
- Bottom-left/right ~30% wide × 35% high is thumb space: no HUD or key action there; keep the player ≥ 25% above the bottom edge.
- Set `orientation`; the kit handles rotate hint, safe areas and audio unlock.

## Accessibility
Never colour-only: add shape, icon or pattern (blue/orange, not red/green). Key sounds get a visual too. ≤ 3 flashes/s.

## Performance
- Pool bullets, particles and enemies (group `get()` + `killAndHide`, reuse 3D objects). No `new`, arrays or closures in per-step loops.
- 2D: ≤ 400 objects, ≤ 120 bodies, atlases. 3D: ≤ 150 draw calls (mobile 100), ≤ 300k tris (mobile 150k), ≤ 4 point lights, `NK3D.instances` for repeats, shadows on hero + big props only. 60 fps, worst frame < 50 ms.

## Audio
- Music volume 0.4–0.6, SFX 0.7–1.0; loopable music, jingle on win/lose.
- Repeated SFX: `rate` 0.9–1.1 via `NK.rng`, ≤ 3 copies at once, ≥ 50 ms apart.
- No clipping: ≤ 6 simultaneous SFX; play big hits at ≤ 0.8 volume.

## Session
1–5 min per level or run; menu → playing in ≤ 2 taps; retry in ≤ 1 s. A replay reason: best score, 1–3 stars, best time or unlocks (`NK.save`).

## DON'T
- Unavoidable damage, hidden required items, undo-less dead ends.
- Input lag, floaty jumps (apex > 0.6 s), off-screen threats.
- Text before play, unskippable intros, emoji, placeholder text.
- Tiny tap targets, HUD under thumbs, colour-only cues.
