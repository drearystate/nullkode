# Vault of Embers: NullKode showcase (3D dungeon crawler)

This is a small, polished playable area built with NullKode's own 3D game kit (`three-3d@1.1.0`: three.js 0.186 + Rapier + the nk-game runtime) and only CC0 assets from the NullKode asset library (KayKit and Kenney). It matches the reference `../references/dungeon.png`: an isometric-ish dungeon hall with a knight and a mage fighting skeletons in front of a torch-lit vault.

## Play

- **Move:** WASD / arrows (screen-relative: W = up the screen). Run with Shift. Phones use the left stick.
- **1 / Space / J / click:** sword swing (soft-locks onto a skeleton in front)
- **2 / K:** the mage casts a homing magic bolt (the mage also casts on its own in a fight)
- **3 / L (hold):** raise the shield. It blocks chops and arrows from the front.
- **4 / H / Q:** drink a potion (+1 heart, 2 potions)
- **Esc / P / pause button:** pause, settings, quit (the kit's menus)

The goal is to cross the flooded hall over the bridge and defeat the vault's two guards. The warrior telegraphs each chop with a red wedge on the floor, and the archer telegraphs each shot with a red lane. Then walk up to the chest. It opens, and the run ends with a score. If you lose all three hearts (damage comes in half hearts), you have fallen.

Phones get a stick, three kit buttons (sword, bolt, shield), and the ability bar, which is also tappable (the potion is there). A landscape hint appears when needed.

## Project layout (a Game Studio project)

```
game.json                 kit three-3d@1.1.0, file load order
assets.lock.json          written by engine/tools/resolve-assets.mjs (never hand-edited)
index.html                the kit template (platform-owned)
src/config.js             renderer look, physics, camera settings, run state, touch, input bindings
src/assets.js             every library id the game uses
src/look.js               material normalisation + palette recolours + shared glow texture
src/entities/fx.js        torch flames, pooled torch lights + fake light pools, water, particles, telegraph markers
src/level.js              the hall as data (walls, torches, props, guards…) + buildLevel(scene)
src/entities/camera.js    the isometric follow rig
src/entities/hero.js      knight: move, swing, block, potion, hurt
src/entities/mage.js      companion: follow (via the bridge), cast homing bolts
src/entities/skeleton.js  warrior + archer AI with telegraphs
src/ui/hud.js             hearts, minimap, objective, ability bar, hints, vignette
src/scenes/menu.js        menu backdrop
src/scenes/game.js        play scene: wiring, objective, vault, win/lose
dev/serve.mjs             local server (/nk-engine/, /game-assets/), port 3437+
dev/shots.mjs             headless screenshots driven by real input (menu|start|stage|fight|play|lose|phone)
dev/probe.mjs             evaluate an expression in the running game (debugging)
```

To run locally, use `node dev/serve.mjs` and open the printed URL. To take screenshots, use `node dev/shots.mjs fight <outDir>` (Chromium with SwiftShader).
After changing asset ids, re-lock with `NK_ASSETS=real node ../../engine/tools/resolve-assets.mjs .`.

## The techniques that mattered most

These are written to be taught to the Game Studio.

### 1. Camera: measure the reference, then build a rig for it

- The reference's floor lines run at about ±25° and the room's far corner sits at the top centre. That is **yaw 45°** with a **pitch of about 38°** (0.66 rad). The slight perspective means a **narrow FOV (28°)** at about **29 m**. The result reads almost orthographic, but walls still converge a little.
- The kit's rigs are third-person and top-down, so the game has its own rig (`IsoRig`). It sets `scene.world.rig` in `create()`, and the kit then uses it instead of building one. `moveYaw()` returns `yaw + π`, so the kit's character controller moves screen-relative: W is always "up the screen".
- Frame **ahead of and below** the hero (`lead`). This puts the hero at about 40% of the frame height, like the reference, so the vault (the goal) stays in view. Clamp the focus to the hall's bounds so the frame never shows the void, and lean toward a focus point (the vault) when it matters.
- **Measure the layout from the reference in world units.** Convert pixel offsets to metres along the screen axes. Right is (+x, −z)/√2. Up the screen on the ground is (−x, −z)/√2, foreshortened by sin(pitch). From the knight, the chest is about 6.4 m north, the bridge about 4 m south and the portcullis about 10 m west. Building the room to those distances is what made the composition match. The first version was a generic 24 × 24 m room, and it framed nothing.

### 2. Lighting: warm torches against cool shadows, within a 4-light budget

- **Cool base:** a hemisphere light (blue-grey sky, dark plum ground) at a modest intensity, and fog in the background colour so distant walls sink into navy.
- **One shadow map only:** a weak, warm-neutral "sun" placed high over the vault (north-west). Contact shadows fall toward the camera, and it follows the hero (the kit's `shadowFollow`). Walls and floors don't cast shadows; characters and props do.
- **Pooled real lights:** there are 13 torches but only **3 real point lights**. Every quarter second they move to the 3 torches nearest the camera focus. They fade out, move and fade back in, so nothing pops. A 4th "fx light" is the vault's gold glow, which the mage's bolt borrows while it flies.
- **Faked light for everything else** (each family is one draw call):
  - an emissive low-poly flame (two instanced cones);
  - a glow halo (one `THREE.Points`);
  - additive radial-gradient **light-pool decals** on the floor under each torch and on the wall behind it.
  These paint the falloff at every torch, real light or not.
- Light colour matters. A pure orange (0xff8a3a) on blue-grey stone turned the floor **pink**. A golden 0xffa24a reads as torchlight.
- `toneMapping: "neutral"` keeps the saturated accents (banners, gold, teal water) that ACES washes out.
- The vignette is a CSS overlay in the HUD. The kit renders without post-processing, so the grade comes from the lights and the palette, not from bloom.

### 3. Palette normalisation: edit the palette, not the models

KayKit models are coloured by small gradient **palette textures**, so recolouring the palette re-grades a whole pack at once (`src/look.js`, a canvas pixel pass done once at load):
- **Dungeon pack:** neutral greys move to darker slate blue, which is the reference's stone. Woods get deeper and less orange, which gives the reference's brown crates. The dungeon pack gets **one shared material**, so every wall, floor and prop has identical treatment (and it's cheaper).
- **Knight:** its red swatches become royal blue (cape and shield). Only the `Knight_Body` mesh's steel becomes a blue tabard, so the helmet stays silver.
- **Mage:** violet becomes deep blue, magenta trims become leather, and the green gem becomes arcane cyan.
- Every pack is made matte (roughness ≥ 0.7, no metal) so no asset looks glossier than its neighbours. Skeleton eye glow is kept, slightly boosted.

### 4. Composition: one focal point, one route, grouped detail

- **Focal point:** the vault. It is a deep arch (`wall-doorway-sides`) with coin stacks inside, the chest on a two-step dais in front, torches flanking it, red heraldic banners beside those, and the only extra gold light.
- **Route:** start south, cross the bridge (posts at its 4 corners, low rails), then reach the guard yard in front of the vault. The channel splits the hall into the two water bands the reference shows: from the portcullis culvert at upper-left, and down past the bridge at lower-right.
- **Grouped props, not scatter:**
  - stores (crates, barrels) stand against the inner west wall at the top centre;
  - more stores sit on the south-west bank and in the south-east corner;
  - the guard post (weapon rack, barrels, keg) is on the east side;
  - remains (skull, bones) lie near a corner, never in the path.
  The combat floor stays clear.
- **Far walls tall, near walls low:** north and west walls are two tiers (8 m), with pilasters running through both tiers for vertical rhythm. South and east are low parapets with torch posts. They frame the bottom and right edges the way the reference's dark foreground blocks do, without hiding the hero.
- **Beyond the edges:** a lower terrace of blocks falls into darkness past the parapets, and a hanging lantern on a chain sits beyond the east parapet. The world doesn't end at the frame.

### 5. Scale normalisation

- Keep the packs' own units: KayKit metres (floor tile 2 m, wall module 4 × 4 m, rig-medium characters ≈ 2.3–2.6 m). Every character uses the same rig (`rig-medium`), so one set of animation clips (skeletons' general and movement, plus character-animations' melee and ranged) drives the knight, mage, warrior and archer alike.
- Hand-held gear (sword, shield, staff, bow, skeleton blade and shield) attaches to the rigs' hand-slot bones at scale 1. Note that three.js's GLTFLoader **renames bones**: `handslot.r` becomes `handslotr`.
- Floor tiles were chosen by eye at play distance. 2 m `floor-tile-small` slabs read as flagstones. The 4 m tile at half scale read as a busy hexagon pattern.
- Non-square pieces are made from the pack's own blocks scaled non-uniformly: channel curbs, bridge rails and dais step treads come from foundation blocks (same palette, same bevels), never from untextured primitives.

### 6. Gameplay readability

- Every enemy attack is telegraphed on the floor in red. The warrior shows a filling wedge for 0.55 s; the archer shows a lane for 0.8 s that tracks slowly, so strafing dodges it.
- The hero's shield shows a blue half-ring on the floor while raised. Every hit gets particles, a sound, a flash and knock-back; sword hits also get a short hit-stop.
- The HUD is one system: slate panels, Kenney Future numerals, and one icon pack (Kenney board-game-icons) tinted by CSS masks. That gives a steel sword, cyan bolt, blue shield with a white cross, a red potion in a pale flask, and red hearts. Cooldowns sweep over the slots.
- Hints are 6 words or fewer and depend on the device ("WASD or arrows to move" / "Use the stick to move", "Hold 3 to raise your shield").

## Visual verification (what was actually run)

Every screenshot is real gameplay rendered by headless Chromium (SwiftShader WebGL) through `dev/shots.mjs`. The keyboard (and, for the phone, CDP touch) drives the game. "Quality: high" is set, as a desktop GPU would pick, and the kit's low-fps auto-downgrade is switched off only for the capture, because SwiftShader runs at 1–8 fps. The same run is played at a small viewport, and the viewport is enlarged just before the capture.

| File | What it is |
|---|---|
| `screenshots/final-1672x941.png` | **Final gameplay frame** at the reference size: crossed the bridge, warrior closing in, the archer's red aim lane, the mage on the bank, the vault up-right |
| `screenshots/final-action-1672x941.png` | Action frame: the mage's bolt hitting the warrior during a swing |
| `screenshots/final-1600x900.png` | Same play at 1600×900 |
| `screenshots/phone-844x390.png` | Phone (landscape, touch on, DPR 2): stick, three action buttons, tappable ability bar, compact minimap |
| `screenshots/menu.png`, `win-vault-opened.png`, `hurt-half-hearts.png` | Kit menu over the hall backdrop, the win screen after a full automated run, half-heart damage |
| `screenshots/review-cycle-0..3.png`, `review-cycle-3b-before-palette.png` | The review cycles (below); 3b is the last frame before the final palette pass |
| `screenshots/compare-reference-vs-final.png` | Reference and final, side by side |

Review cycles (three biggest differences each time, fixed, then captured again):
0. **First render.** The scene was too bright and flat pink. Bones failed to attach, because GLTFLoader renames `handslot.r` to `handslotr`. The mage was purple. Fixes: corrected bone names, cut ambient, recoloured the mage, changed the light colour.
1. **Composition did not match.** The generic room framed nothing, and the warm light read pink. I measured the reference in world metres and rebuilt the hall (chest 6.4 m north, bridge 4 m south, inner west wall with stores at the top centre, tall pilastered walls). I switched to golden light and replaced the busy 4 m floor tiles with 2 m flagstones.
2. **Knight not blue, foreground plain, flames weak.** Fixes: blue tabard recolour on the body mesh, low parapets with torch posts and a terrace beyond, brighter flame halos, deeper water.
3. **Fight staging and palette.** The warrior hid behind the knight, so the guards now hold the vault yard until the knight reaches the north bank (the fight happens side-on). Hit flashes blew the skeleton out to white, so they were toned down. The whole frame was warmer and more orange than the reference, so the stone was cooled, the woods desaturated and the torch power reduced.

Gameplay checks, all automated with real input:
- `dev/shots.mjs play`: a full run (cross, fight both guards with blocks, swings and bolts, open the vault) ends in `NK.gameOver({win:true})`, score 2072, with 0 errors.
- `dev/shots.mjs lose`: standing passive goes 6 → 2 half-hearts, the potion heals +2, then 0 health and game over, with 0 errors. The mage killed the warrior on its own in that run.
- The phone run moves the knight with the touch stick.
- Draw calls are about 190 and triangles about 145k at the final frame, within the core rules' 150k-triangle and roughly 200-call range. There is 1 shadow map and at most 4 point lights.

## Remaining differences from the reference (honest list)

- **No true arch masonry or fleur-de-lis.** The reference's round stone arches and gold fleur-de-lis banners don't exist in the packs. The vault uses KayKit's deep doorway (`wall-doorway-sides`), and the banners carry KayKit's shield-and-swords crest.
- **The mage wears KayKit's pointed hat, not a hood**, and is recoloured to blue. The knight's helmet is KayKit's rounded one (no visor slit like the reference).
- **The hanging cage is a hanging iron lantern** on a chain. No cage exists in the library.
- **The bridge is a flat stone deck** with low lips and four posts. The reference's bridge sits slightly higher with chunkier block railings, and its channel has more broken-block edging.
- **The stone is cleaner and more regular** than the reference's chunky, irregular painted blocks, and the floor is hexagon-centred KayKit flagstones instead of square slabs. That is the pack's style.
- **No bloom or depth of field.** The kit renders without post-processing, so glow comes from additive sprites and decals, and the grade from a CSS vignette. Flames read as low-poly cones with halos, softer than the painted flames.
- **Soft shadows are softer in the reference.** The kit's high tier asks for PCFSoft, but three r186 falls back to PCF, so the knight's contact shadow is crisper.
- **Water** is a flat-shaded animated surface with highlight motes. It has no reflections of the torches, as the reference suggests.
- **The HUD uses the kit's Kenney Future font** (uppercase display face) instead of the reference's rounded sans. The minimap is this hall's real plan, simpler than the reference's sketch. A pause button sits next to the minimap.
- **The frame is a moment of real play**, so poses and positions vary from run to run. The reference's exact staging (knight mid-swing with a big white arc while the archer aims) occurs, but the captured frame is whichever moment the scripted play reached.

## Asset credits

All assets are CC0: KayKit (Kay Lousberg), namely Dungeon Pack, Adventurers, Skeletons, Character Animations, Fantasy Weapons Bits, Mixed Bag 1 and Halloween Bits; and Kenney, namely Board Game Icons, Mobile Controls, Foley Sounds, RPG Audio, Impact/Interface sounds, New Platformer Pack, Retro Sounds 2, Music Loops and Music Jingles. See `spec.md` for the full mapping.
