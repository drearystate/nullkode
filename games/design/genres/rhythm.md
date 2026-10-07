# Rhythm — phaser-2d (gravity 0)
**Loop:** notes approach in time with music → tap/hold on the beat → judgement + combo → song ends → grade + score.
**Verbs:** tap lane, hold, release; optional swipe.

**Timing (the core):**
- Never time from frames. Song clock = audio clock: `const h = NK.audio.play("song", {channel:"music"}); const ctx = h.source.context; const t0 = ctx.currentTime;` then `songTime = ctx.currentTime − t0 − offset`. Start the song only after a tap (audio is locked before; `h.source` is missing then).
- Or build the music yourself: schedule drum/synth hits with `NK.audio.play(key, {delay})` 0.1–0.2 s ahead at a fixed BPM — perfect sync by construction.
- Judgement windows: Perfect ±45 ms, Great ±90 ms, Good ±135 ms, else Miss. Input timestamps: use the time of the step the press arrived in (60 Hz → ±8 ms).
- Calibration offset setting −150…+150 ms (tap-along screen, 8 taps averaged); save with `NK.save`.
- Approach time 1.0–1.6 s (easy 1.6); note speed constant within a song.
- BPM 90–140. Easy: quarter notes; normal: eighths; hard: syncopation, holds, two-lane chords. Min 0.25 s between notes in one lane on easy.

**Charts/content:**
- Chart = list of `{t (s or beat), lane, hold}`; derive from BPM: `t = beat × 60 / BPM + firstBeat`. Library loops are short (median 12 s, `kenney/music-loops`): measure BPM = beats ÷ duration, loop 4–8× with chart variations.
- 3–4 lanes on mobile, lane width ≥ 160 game px; hit line at 80% height (portrait) / right side (landscape).
- Song 60–120 s; first 4 bars sparse; difficulty peaks at 70%; last bar a clear ending.

**Progression/win-lose:** score = judgement × combo multiplier (×1→×4 at 10/20/30); grade S/A/B/C by accuracy (95/90/80/70%); health bar optional (miss −8, hit +2) → fail if empty on normal+. Best grade per song saved.

**Mobile:** lanes are the buttons (tap anywhere in a lane column); portrait 720×1280 recommended; `touch: { stick: false, buttons: [] }`; keyboard D F J K / arrows.

**Juice:** lane flash on press, judgement text pop ("Perfect") for 0.3 s, note burst particles, combo counter bump, beat-pulse on background/HUD (skip with reduce motion), miss = dimmed note + low thud (no shake).

**Mistakes:** frame-timed notes drifting off the music; notes off the beat; no calibration; windows tighter than ±45 ms; dense charts in the first 10 s; notes overlapping the HUD; same lane colour for every note type.

**Assets:** music `kenney/music-loops`, beats from `kenney/impact-sounds`, `kenney/digital-audio`, `kenney/synth-voice-1`; visuals `kenney/particle-pack`, `kenney/ui-pack-sci-fi`, `kenney/pattern-pack-lines`.
