# Idle / clicker — phaser-2d (gravity 0, mostly UI)
**Loop:** tap for currency → buy producers → production grows → unlock milestones → prestige for a permanent multiplier → faster loop.
**Verbs:** tap, buy (×1/×10/max), upgrade, prestige, collect offline earnings.

**Tuning:**
- Tap gives value immediately with a "+N" pop at the tap point; first purchase affordable in 10–20 s of tapping.
- Producer cost `base × 1.07–1.15^owned`; output linear per unit; ×2 multipliers at 10/25/50/100 owned.
- Next producer tier unlocks when the previous costs ~10× its base; 6–10 tiers.
- Something new to buy every 30–90 s in the first 10 min; first prestige available at 15–30 min, giving +10–25% per prestige point (shown before confirming).
- Offline earnings: rate × elapsed (store `Date.now()` in `NK.save`), capped at 2–8 h, shown on return with a "Collect" button.
- Big numbers: format 1.23K, 4.56M, 7.89B…, then 1.0e15; never show raw floats. Use plain numbers below 1e15 (no BigInt needed for short games).
- Autosave every 10 s and on every purchase (`NK.save.store`).

**Content:**
- Screen: big tap target centre (≥ 300 game px), currency + per-second at the top, shop list on a side panel (scrolling, rows ≥ 96 game px tall).
- Each producer shows cost, owned, output, and grey/disabled state + "need X more" when unaffordable.
- Achievements for milestones (`NK.platform.achievements.unlock`); 3–5 upgrade types (tap power, producer ×2, global ×).
- Light goal structure: "Reach 1M" chapters with a small scene change per chapter.

**Progression/win-lose:** no lose state. Optional "win" at a final milestone with stats (time, taps). Leaderboard on total earned.

**Mobile:** portrait recommended (`orientation:"portrait"`, 720×1280); no stick/buttons (`touch: { stick: false, buttons: [] }`); tap target in the centre; shop in the lower half but scrollable rows, buy buttons on the right edge for thumbs.

**Juice:** tap squash 0.9→1.05 in 0.1 s, coin particles fly to the counter, counter rolls (not jumps), purchase chime with pitch by tier, milestone banner, prestige = full-screen flash (respect reduce motion) + jingle.

**Mistakes:** costs growing faster than production (walls in minute 5); unreadable numbers; nothing to buy for minutes; progress lost on reload; tap rewards that don't scale; prestige with no preview of the gain.

**Assets:** `kenney/ui-pack`, `kenney/ui-pack-adventure`, `kenney/game-icons`, `kenney/generic-items`, `kenney/medals`, `kenney/particle-pack`, `kenney/animal-pack-remastered` (cute producers); sound `kenney/casino-audio`, `kenney/ui-audio`, `kenney/music-jingles`.
