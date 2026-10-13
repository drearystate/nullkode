# Rhythm — phaser-2d (gravity 0)
**Loop:** notes approach → tap/hold on the beat → judgement + combo → grade + score.
**Verbs:** tap lane, hold, release; optional swipe.

**Timing (the core):**
- Never time from frames. Song clock = audio clock: `const h = NK.audio.play("song", {channel:"music"}); const ctx = h.source.context; const t0 = ctx.currentTime;` then `songTime = ctx.currentTime − t0 − offset`. Start the song after a tap (audio locked before; no `h.source` then).
- Or make the music: schedule drum/synth hits with `NK.audio.play(key, {delay})` 0.1–0.2 s ahead at a fixed BPM (sync by construction).
- Judgement windows: Perfect ±45 ms, Great ±90 ms, Good ±135 ms, else Miss. Input time = the step it arrived in (60 Hz → ±8 ms).
- Calibration offset −150…+150 ms (tap-along, 8 taps averaged), saved with `NK.save`.
- Approach time 1.0–1.6 s (easy 1.6); constant note speed per song.
- BPM 90–140. Easy: quarter notes; normal: eighths; hard: syncopation, holds, two-lane chords. Easy: min 0.25 s between notes in a lane.

**Charts/content:**
- Chart = list of `{t (s or beat), lane, hold}`; derive from BPM: `t = beat × 60 / BPM + firstBeat`. Library loops are short (median 12 s): BPM = beats ÷ duration; loop 4–8× with chart variations.
- 3–4 lanes on mobile, lane width ≥ 160 game px; hit line at 80% height (portrait) / right side (landscape).
- Song 60–120 s; first 4 bars sparse; difficulty peaks at 70%; last bar a clear ending.

**Progression/win-lose:** score = judgement × combo multiplier (×1→×4 at 10/20/30); grade S/A/B/C by accuracy (95/90/80/70%); health bar optional (miss −8, hit +2) → fail if empty on normal+.

**Full game:** 6–10 songs (levels/*.json charts or BPM-generated) × 2–3 difficulties in 2–3 sets, unlocked by grade (B on 3 songs); 15–30 min. Each set adds a note type (holds → chords → syncopation) and BPM, a calmer song after hard ones, a showpiece finale. Song select with grades, `NK.save` (Continue); final set cleared → ending screen; replay = S grades, full combos. Slice (phase 1): menu + calibration + 2 songs.

**Mobile:** tap anywhere in a lane column; portrait 720×1280; `touch: { stick: false, buttons: [] }`; keyboard D F J K / arrows.

**Juice:** lane flash, judgement pop ("Perfect") 0.3 s, note burst, combo bump, beat-pulse on background (not with reduce motion), miss = dimmed note + low thud (no shake).

**Mistakes:** frame-timed notes drifting; notes off the beat; no calibration; windows < ±45 ms; dense first 10 s; notes under the HUD; one colour for all notes.

**Assets:** music `kenney/music-loops`, beats `kenney/impact-sounds`, `kenney/digital-audio`, `kenney/synth-voice-1`; visuals `kenney/particle-pack`, `kenney/ui-pack-sci-fi`, `kenney/pattern-pack-lines`.
