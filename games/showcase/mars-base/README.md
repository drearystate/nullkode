# Red Horizon: NullKode showcase (Mars colony base-builder)

A small, polished, playable Mars colony built with NullKode's own 3D game kit (`three-3d@1.1.0`) and only CC0
library assets (KayKit + Kenney). The visual target is `../references/mars-base.png`.

- Final gameplay screenshot: `screenshots/final-1672x941.png` (plus `final-1600x900.png`)
- Phone screenshots: `screenshots/phone-landscape-844x390.png`, `screenshots/phone-portrait-390x844.png`
- Review cycles: `screenshots/review/` (`cycleN-before/after.png`, `final-vs-reference.png`)
- Gameplay run-throughs: `screenshots/playtest/` (mouse and keys) and `screenshots/playtest-phone/` (touch)
- Visual spec and asset list: `spec.md`

## Play

```
node dev/serve.mjs          # http://127.0.0.1:34xx/ (maps /nk-engine/ and /game-assets/ like the platform)
```

| | Desktop | Phone |
|---|---|---|
| Pan | drag, WASD / arrows | one-finger drag |
| Zoom | wheel, + / - | pinch (clamped 38–110 m) |
| Build | click a toolbar slot or 1–5 → move → click | tap a slot → tap the spot → tap again or **Place** |
| Rotate / cancel | R / Esc or right-click | Rotate / Cancel chips |
| Rover | click the rover, then the crystals | same with taps |
| Pause | P or the pause button (settings are in the pause menu) | pause button |

**Loop.** The colony's power line has one missing solar array.

1. **Connect solar power.** Build a Solar Panel on the glowing socket. It snaps on, the cable lights up and energy
   starts flowing.
2. **Gather crystals.** Send the rover along its dashed route to the crystal deposit. It drives out, mines and comes
   back with +40 crystals.
3. **Build an Oxygen Tank.**
4. **Build a Habitat.** New crew walks out, and the colony is established (a win screen with score and best).

Other systems:
- **Placement.** Validity shows by colour and by shape: a cyan ring with a check, or an orange hatched disc with a
  cross. Placement is blocked when you can't afford it, when it's outside the build zone, on top of other things, in
  a crater or on the rover lane.
- **Storage** raises resource caps.
- **Defense** turrets shoot down the meteors that start falling once power is on. A red ring telegraphs where each
  one will land 2 s ahead, and each meteor a turret catches gives +15 crystals.
- **Sols** advance every 40 s.
- **Live edits.** All run state is in `NK.run`, so live edits and reloads keep the colony.

## Project layout (Game Studio format, `game.json` load order)

```
game.json, index.html, assets.lock.json       kit three-3d@1.1.0; the lock is generated (engine/tools/resolve-assets.mjs)
src/config.js           renderer look: lens, sun, sky fill, tone mapping, fog, touch, run state
src/assets.js           56 library ids, all CC0 (full string literals so the platform's lock scan finds them); the lock adds the kit's 7 touch-art ids
src/levels.js           THE LAYOUT: every building, prop group, crater, rock, route, cost and objective, in metres
src/world/materials.js  palette + material normalisation, pivot normalisation, KayKit atlas swaps
src/world/terrain.js    faceted ground mesh with carved craters + flat building pads (deterministic noise)
src/entities/buildings.js  building compositions (shared by the set, the build ghost and the toolbar icons)
src/entities/astronaut.js  colonists (Space Ranger + helmet/backpack on bones) + dynamic contact shadow
src/entities/rover.js      rover, selection ring, dashed route
src/world/colony.js     static set assembly, scatter (fixed seed), contact shadows, static batching, power cable
src/world/camera-rig.js strategy camera: pan/zoom/pinch, tap detection, shadow + fog follow the view
src/systems/*.js        effects pool, placement, meteors
src/ui/*.js             SVG glyphs + in-engine thumbnails, HUD, minimap
src/scenes/menu.js      menu backdrop (drifting camera over the colony)
src/scenes/game.js      gameplay: input, economy, objectives, building, restore
dev/                    local server, screenshot + playtest scripts, asset lab (not part of the game)
```

It uses no kit edits and creates no renderer or loop: `world.rig` is replaced by the game's own rig, which the kit
updates each frame.

## Techniques that mattered most

These are worth teaching to the Game Studio.

1. **Camera: a long lens, not a true ortho camera.**
   - The reference is a near-isometric view with mild perspective. The setup is `fov: 26` and a fixed 28° yaw /
     33° pitch at about 86 m, with the main base axis along world X. The 28° yaw puts that axis at the reference's
     ~0.3 screen slope (a pure 45° isometric would not).
   - Pixel positions measured on the reference were projected onto the ground plane (pinhole maths) to get world
     coordinates for the layout.
   - Portrait screens pull the camera back a little rather than re-framing.
2. **Lighting: one warm sun plus a cool fill, with ratios that keep shadows readable.**
   - The sun (3.9) comes from the screen's upper left, so shadows fall right and down as in the reference.
   - The hemisphere fill is low (0.62) and lavender over terracotta, which makes shadow sides purple-brown instead
     of black or orange.
   - ACES tone mapping and a 0.25 environment map are the only post-processing.
   - Fog distance is tied to the zoom: the colony is never hazed and the far plain always is, so the world
     "continues past the edges" without a visible plane border.
3. **Palette normalisation: make two packs look like one.**
   - Kenney Space Kit GLBs are flat named colours with glTF's default metalness 1, so they look pale and chrome-like.
     They are rebuilt by material name (`metal`, `dark`, `rock`, ...) into rough, non-metal standard materials from
     one `PALETTE`.
   - KayKit uses one swatch atlas (8×4 vertical gradients), so recolouring a KayKit piece is a **swatch copy** into a
     cloned atlas (`atlasVariant`):
     - the hub's gold dome becomes navy, matching the reference's white/navy/yellow;
     - the orange tank and pad skirt become white;
     - the red cargo becomes navy.
   - Textured rocks get a multiply tint (taupe × pink = the reference's mauve boulders).
   - Accent colours are reserved for meaning: cyan for selection, routes, valid placement and crystals; orange for
     invalid placement and meteor warnings.
4. **Composition: layout as data, in functional groups.**
   - `levels.js` holds one focal point (the hub with its lit door) and one readable route (rover → crystals, kept
     clear as a placement blocker).
   - Supplies sit by the pad and the doors, lamps sit at the pad corners facing it, and the solar arrays sit along
     the cable.
   - Large forms frame the screen corners (foreground boulders bottom-left), medium props stay near the buildings,
     and small accents are scattered.
   - Scatter uses a fixed seed with keep-out zones around everything functional, and its density follows the
     quality tier.
   - Three review cycles moved things toward the reference's distribution (see below).
5. **Scale normalisation.**
   - Everything is in metres with explicit target sizes:
     - KayKit base pieces are ×3.4, so a door is about 2.4 m;
     - colonists are 2.2 m (chibi proportions read at this distance);
     - Kenney pieces are sized by `height`;
     - forest boulders are sized by scale against their 2.6 m native size.
   - **Pivot normalisation:** every piece is re-centred to base-centre (packs mix base-edge, mid-centre and Kenney's
     base-offset pivots). Without this, scaling a Kenney rock ×8 moved it metres off its spot.
6. **Grounding without expensive tricks.**
   - Shadow maps hug the visible area (the frustum follows the camera target and zoom).
   - Every static object also gets a soft **contact-shadow decal**, and dynamic objects carry their own. With 512 px
     shadows or none, which is what phones get, the scene still sits on the ground.
7. **Static batching.** All static set pieces are baked to world space and merged per material, taking about 150
   meshes down to about 35 draws. That brought draw calls from 296 to about 165, shadow pass included.
8. **Toolbar icons rendered in-engine.** Each building is rendered with the game's own renderer (into a corner of the
   canvas, read back in the same task), so the icons match the world's lighting, palette and tone mapping exactly.

## Review cycles (each compared at 1672×941 against the reference)

| Cycle | Three biggest differences found | Fix |
|---|---|---|
| 1 | (a) framing too tight and low; (b) faint shadows, over-saturated noisy ground, warm-red boulders and red crates against the reference's cool mauve-grey; (c) no mid-size rock scatter | camera dist and target; sun/fill ratio and direction; ground palette and smoother facets; boulder tint; atlas swap red cargo → navy; instanced mid-size rocks |
| 2 | (a) rover route and deposit hugging the base, leaving an empty lower third; (b) colonists too small next to the modules; (c) too few mid rocks on the plain | route and crater moved toward the camera; foreground boulders trimmed to the bottom-left; people 1.8 → 2.2 m; rock count ×2 |
| 3 | (a) HUD hierarchy: two-line objective against the reference's compact one-liner, small toolbar icons; (b) pad and ship under-weighted with an off-palette orange skirt; (c) pebbles too warm | objective hint folds after a few seconds; bigger, brighter thumbnails; pad atlas swap to white, larger dropship; cool grey pebble tints |

After the cycles, the phone layouts were fixed. Each new objective now frames its target above the toolbar; the touch
playtest caught the crystal deposit hidden under the toolbar on an 844×390 screen. Other phone fixes: finger-sized toolbar with minimum font sizes, minimap moved above the
toolbar in portrait, fog tied to the zoom, and toasts moved to the top.

## Remaining differences from the reference (honest list)

- **Modules.** KayKit's rounded mobile-base modules with gold-lit windows stand in for the reference's long white
  cylinders with navy panels and thin yellow pinstripes. They also sit on the ground instead of on stilts.
- **Hub.** The hub is a KayKit octagon with an (atlas-swapped) navy geodesic dome. It has no ring of windows and no
  entrance ramp.
- **O2 tanks.** The tanks are stacked KayKit water tanks recoloured white. They have no "O₂" lettering and no pipe
  runs; no tall capsule tank exists in the packs.
- **Satellite dish.** The Kenney dish is blocky and square, not the reference's round parabolic dish.
- **Solar arrays.** The arrays are KayKit roof-solar units on octagon plates. The reference has large tilted panels
  on posts.
- **Greenhouse.** It is a glass dome over a teal planter, without the reference's white frame ribs.
- **Crystal deposit.** It is chunkier (six large slate boulders) with fewer, larger shards. The reference has a pile
  of many small dark rocks.
- **Landing pad.** The KayKit pad has a block skirt and arrow markings. Its yellow ring is an added decal.
- **Lamps.** The lamps are Kenney floodlight posts, not square lamp heads. There is no bloom, only small additive
  glow sprites.
- **Pause button.** The HUD has a pause button (required by the kit flow) that the reference does not show.
- **Minimap.** It uses simple squares and dots, not the reference's building glyph icons.
- **Ground.** The facet pattern is a little more visible than the reference's soft painted shading.
- **Phone settings panel.** The kit's settings screen overflows a 390 px-tall landscape phone (a kit issue, see
  below).

## Verification notes

- All screenshots are real captures from headless Chromium with SwiftShader WebGL. The HUD and placement come from
  real mouse, key and touch input.
- The quality setting was "High", which is what a device with a GPU auto-selects. SwiftShader itself would pick
  "Low"; a Low capture was also checked, with 512 px shadows and no AA, and it holds up.
- For captures only, the kit's fps guard was disabled with `NK.off("perf")`, because SwiftShader renders 1–4 fps and
  the guard would otherwise blur the frame.
- Game time in the playtests was advanced by stepping the scene, so the rover trips and economy ticks don't take
  minutes of real time at 1 fps.
- No console errors in any run.
- Hot reload (`NK.driver.hotReload`) keeps exactly one HUD and the run state.
- Pinch, drag, clamping, pause, settings and Reduce motion were checked.
- Budget (desktop, High; shadow pass included): about 165 draw calls and about 268k triangles. The Low tier halves
  the scatter (about 190k).

## Kit notes found while building (not changed)

- The brief named `three-3d@1.0.0`. The Game Studio's current `KIT_VERSION` is 1.1.0, which is 1.0.0 plus the
  Reduce motion setting that CORE-RULES requires, so the game targets 1.1.0. Switching back means changing one string
  in `game.json` and `index.html`.
- three r186 has removed `PCFSoftShadowMap`, so the kit's High tier logs a warning and falls back to PCF.
- The kit has no orthographic or strategy camera. The rig here (pan, pinch, tap vs drag) could become a kit mode.
- The settings screen (`NK.ui.settings`) doesn't scroll on short landscape phones.
- `NK3D.instances` only takes uniform scale and Y rotation, which was enough here.
