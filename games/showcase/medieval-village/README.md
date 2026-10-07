# Hearthvale: a NullKode showcase game

A cosy medieval village builder made with NullKode's own 3D game kit (`three-3d@1.1.0`, the kit the Game Studio
uses for new games) and only CC0 assets from the NullKode asset library (KayKit + Kenney), so it can ship in the
open-source release. One finished, composed village and one interaction: pick a building, preview it on a hex,
place it.

![Gameplay](shots/final-gameplay-1600x900.png)

| Placement preview (valid) | Placement preview (invalid) | Phone (landscape) |
|---|---|---|
| ![](shots/placement-preview-1600x900.png) | ![](shots/placement-invalid-1600x900.png) | ![](shots/phone-landscape-844x390-preview.png) |

## Play
- Pick a building in the toolbar (or keys 1-6). Hover a hex: gold outline = you can build there, dashed red = you
  can't, and the tip says why. Click to build. Right-click or the x cancels.
- Touch: tap a card, tap a hex to preview, tap it again to build. Drag to pan, pinch to zoom.
- Mouse: drag to pan, wheel to zoom (about the pointer). Esc / P or the menu button pauses (kit menu + Settings).
- Time controls (top-right): pause the village, normal, fast. A day is 20 s; buildings produce at dawn.
- Goals: build a windmill → plant a farm beside a windmill → bridge the river again → grow to 60 villagers.
  No fail state.

## Run it locally
```
node tools/serve.mjs                # http://127.0.0.1:34xx  (/nk-engine -> engine/kits, /game-assets -> library)
node tools/validate.mjs             # the Game Studio's file/syntax/forbidden-API/asset-licence checks
node tools/shoot.mjs out.png        # headless screenshot (1600x900, quality "high", --mobile, --eval "js")
node tools/playtest.mjs shots       # real-input e2e: desktop + phone landscape + phone portrait, writes shots/
python3 tools/plan.py plan.png      # top-down plan of src/levels.js with the camera footprint
```
`assets.lock.json` is written by `node ../../engine/tools/resolve-assets.mjs .` (the same step the Studio runs).

## Files (a Game Studio project)
```
game.json            kit three-3d@1.1.0, load order
assets.lock.json     generated from the ids in src/ (never hand-edited)
index.html           the kit template (the platform writes its own)
src/config.js        renderer look, run state, menu
src/assets.js        every library id the game uses (78, all CC0)
src/palette.js       palette repaint, matte materials, scale normalisation, faceting, villager mesh merge
src/hex.js           flat-top hex grid maths + road/river auto-tiling
src/levels.js        the village layout as data (cells, roads, river, buildings, groves, vignettes)
src/entities/camera.js     orthographic camera rig (pan/zoom/pinch, clamps, shadow fitting)
src/entities/buildings.js  building catalogue (costs, rules), assembly, spinning parts, per-building props
src/entities/village.js    builds the world: tiles, river, roads, square, fields, forest, decor, static batching
src/entities/villagers.js  six villagers walking the roads between jobs
src/entities/icons.js      HUD icons rendered from the game's own models at load
src/entities/hud.js        cream/navy HUD + theme for the kit's menus
src/entities/placement.js  tool selection, preview, validity rules, placing, world input
src/scenes/menu.js   menu backdrop: the same village, camera swaying slowly
src/scenes/game.js   the playable scene: economy, goals, time controls
```

## How it was built: the techniques that mattered most
These are the things a first-pass Game Studio build would need to do to reach this look.

1. **Pick one base set and normalise everything into it.** The KayKit Medieval Hexagon pack is self-consistent (one
   palette texture, one scale, one style), so it is the base. Everything else is a small accent from sibling KayKit
   sets. Scale is normalised with one rule (`palette.scaleOf`). Ground pieces stay at native size. Everything
   standing is ×1.4 so buildings fill their hex like a diorama. Character-scale sets (made for 2.3 m heroes) go down
   ×0.2-0.4 first, then ×1.4. Walls on hex edges keep their length and only get taller.
2. **Repaint the shared palette instead of fighting materials.** All 500+ hex-pack models sample one 8×4 grid of
   vertical gradients. `tools/diag` measured which swatches and which part of each gradient the models use
   (grass tops use t=.30-.37, roofs `1,3`, plaster `1,0`, stone `2,0`, …). `palette.js` then repaints those swatches
   on a canvas once at load: olive grass → fresh green, blue-grey stone → warm cream, red → terracotta, emerald →
   forest green. Every hex-pack mesh then shares that one material. Result: one coherent palette, one texture,
   matte (roughness 1, metalness 0).
3. **Orthographic camera rig of the game's own.** The kit's rigs are perspective and follow a player. The game swaps
   an orthographic camera into `world.camera` while its scene runs and restores the kit's on dispose. Settings:
   pitch 40°, yaw -18°, 24 m wide at 16:9. Pan and zoom are clamped so the world's edge never shows (checked at
   max zoom in every corner). Portrait keeps at least 64% of the width.
4. **Fit the shadow box to the view every frame.** In an orthographic view the visible ground is a known rectangle,
   so the sun's shadow camera is sized to it (plus a margin) and follows the camera target. Sharp shadows at any
   zoom with a modest map. PCF radius 2.6 and 88% strength give soft shadows that keep detail in shade.
5. **Contact shadows without AO.** The kit has no post-processing, so a soft radial blob (one instanced quad
   batch) sits under every building, tree and villager. This grounding matters as much as the sun shadows.
6. **Lighting for a warm afternoon.** One sun (`#ffd9a6`, ~37° up, from the south-west, so shadows fall away from the
   paths and fronts face the light), hemisphere fill, a little environment light, "neutral" tone mapping (ACES
   shifted the greens and oranges). No fog, no bloom.
7. **Composition rules, applied as data + review.** The layout is authored in `levels.js` and checked top-down with
   `tools/plan.py` against the camera footprint and the HUD zones. Rules that worked:
   - a small paved square with the landmark on its far side;
   - dense clusters with open buildable meadow between them;
   - three roads that each end somewhere (bridge → lumber camp, windmill, jetty);
   - forest density from distance + two noise octaves, with clearings;
   - props from per-building lists with tiny seeded jitter (never random scatter);
   - hand-placed vignettes for the gaps (hay meadow, vegetable beds);
   - everything deterministic from one seed.
8. **Auto-tiling from paths.** Roads and the river are written as waypoints. `hex.path` expands them to cells, and
   `hex.autotile` picks the KayKit tile + rotation from each cell's links. The edge masks were measured from the
   models' geometry, not guessed.
9. **Static batching + a triangle budget.** All static objects are baked into one merged geometry per 20 m chunk per
   material (almost everything shares the repainted material). Villagers' seven skinned parts are merged into one
   skinned mesh each. Deep-forest trees and small props don't cast shadows. Result: 374 → about 120 draw calls,
   ~300k triangles (main + shadow) at the default view on the "high" tier.
10. **HUD art from the game's own models.** Toolbar and resource icons are rendered at load from the same models,
    light and palette (keyed out of a corner of the game canvas). So they always match the world, in any palette,
    with no extra assets. The kit's menu, pause and settings panels get the same cream/navy/gold theme via CSS on
    the kit's classes.
11. **Review in a loop with the real renderer.** Every change was checked in headless Chromium screenshots at
    1600×900, plus zoomed close-ups for scale/floating/clipping problems. The interaction is checked with real input
    (`tools/playtest.mjs`).

## Review cycles (screenshot → 3 biggest problems → fix → screenshot) — `shots/review/`
| Cycle | Biggest problems found | Fixes |
|---|---|---|
| 0 → baseline | river rendered green (ground plane above the water), buildings tiny on 2 m hexes, vast empty grass, 786k triangles | ground plane moved under the water; ×1.4 standing scale; denser clusters + groves; yaw flipped so the lumber camp left the HUD zone; cheap pines for the deep forest |
| 1 | dock and south road under the toolbar, lumber camp clipped, roofs touching the top; villagers ~20 px; "Lumber Camp" label clipped; cart clipping a cottage, market hidden, stray wall pieces | recomposed (dock moved north, 24 m view), villagers ×1.25, wider cards, cart moved, cottage moved, garden walls only as one continuous L |
| 2 | empty meadow lower right; dock on dry land; smooth dark "blob" bushes and round pines | vegetable beds, hay meadow vignette, jetty, flat-shaded foliage |
| 3 | flower accents read as litter; flat high-key light with faint shadows; sunken dock; uniform forest wall | flowers dropped; lower warmer sun, softer but stronger shadows, large-scale grass tint + darker forest floor; noisy forest edge with clearings; pallet jetty that reaches the water |
| 4 | windmill squat with its sails edge-on; reeds far from water; no depth cue | windmill turned to the viewer and enlarged; reeds only at the water's edge; soft vignette |
| 5 | grass slightly over-saturated; boulder pile on the north bank; benches reading as planks; only one bridge site near the village | calmer greens, smaller rocks, dungeon-pack bench, straight northern river stretch (4 bridge sites in view) |

## Measured
- Draw calls / triangles per frame (main + shadow pass), default view: **117-125 / ~296-312k** on "high" (desktop,
  right at the kit's 300k guideline; it varies with where the villagers are);
  **108 / ~230k** on "low"/"medium" (phones get a thinner deep forest, no tree shadows, 4 villagers instead of 6).
- 15 files, 109 kB of game code (Studio limits 160 kB/file, 600 kB total), 78 asset ids, all CC0. `tools/validate.mjs` passes.
- `tools/playtest.mjs`: all checks pass on desktop (hover preview, place, resources spent, goals 1 and 2, invalid
  preview, right-click cancel, drag pan, wheel zoom, pause/settings/resume, no errors). Also passes on phone
  landscape 844×390 and portrait 390×844 (tap card, tap previews, second tap builds, no errors).

## Not met / known limits (honest list)
- **No real ambient occlusion.** The kit has no post-processing. Contact shadows are soft blobs, not SSAO.
- **Soft shadows are PCF with a wide disk**, not true penumbras. three r186 removed PCFSoft; the kit warns about it
  on its high tier.
- **Phone budget:** 108 draw calls / ~230k triangles is above the kit's mobile guideline (100 / 150k). The rest is
  mostly the KayKit buildings themselves (1-5k triangles each, in both passes). The kit's adaptive guard lowers pixel
  ratio and then shadows if fps drops. Not measured on a real phone (all rendering here is SwiftShader).
- **Pinch zoom and touch-drag pan are implemented but not covered by the automated test** (Playwright can't
  synthesise two-finger input easily). Tap-to-preview / tap-to-build are tested. Mouse drag/wheel are tested.
- **Flowers / extra ground accents:** Kenney Nature Kit flowers clashed at this scale, so the meadows rely on bushes,
  rocks, stumps, vegetable beds and hay. That's a smaller accent palette than the reference image.
- **Content the reference has but the library doesn't:** fountain, banners with crests, deer, waterfall, striped stall
  awnings in blue. The square has a well, the KayKit market stall and a merchant cart instead.
- **Placed buildings are not saved** between sessions. A Studio live edit rebuilds the village from `levels.js`
  (the run's resources and goals survive).
- The hex grid is visible as a faint pattern. The reference shows it too, so it's kept, only softened (tile normals
  bent upward).
- Villager walking is along road splines with a side offset. Villagers don't avoid each other beyond keeping to
  their side of the path.
