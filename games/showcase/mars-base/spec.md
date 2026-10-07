# Red Horizon: visual specification and asset list

Target: `../references/mars-base.png` (1672x941, AI-generated). This spec was written before implementation from
a study of the reference and the actual KayKit / Kenney packs. Section 4 records what changed during the build.

## 1. What the reference shows

**Camera and projection.** A high three-quarter view with mild perspective (a long lens). Ground circles (the
landing pad, the craters) read as ellipses with a height/width ratio of about 0.5, which puts the camera about
32 degrees above the ground. The base's main axis (habitat - hub - lab - greenhouse) runs about 30 degrees off the
screen horizontal, so the camera yaw is about 30 degrees off the world axes. It is not a true 45-degree isometric
view. The playable area spans about 55 m across the screen at the centre (the astronaut is about 55 px tall, so
about 30 px per metre).

**Framing.**
- Foreground: large dark faceted boulders in the bottom-left corner and smaller ones bottom-right. They frame the
  view without covering anything you can play with.
- Middle ground (the playable band): the landing pad and dropship on the left. The base runs through the centre
  from the hub dome. The rover and crystal deposit sit in the lower centre and lower right.
- Background: the satellite dish, the O2 tanks and the solar field along the top. Craters, rocks and the plain
  run past every edge of the screen.

**Focal point.** The hub dome sits in the upper centre with its lit door. The traversal route is the open ground
from the hub door, past the rover, to the crystals, shown as a dashed cyan line.

**Distribution.** Buildings form one connected spine. Props sit in functional groups: crates by the pad and the
hub, lamps at the pad corners, a power box at the end of the solar cable, astronauts at doors. Empty ground is
left for building. Small dark pebbles are spread evenly at low density. There are larger rock clusters at the
edges, two big craters (bottom centre and top right) and several small ones.

**Palette (sampled).**

| Use | Colour |
|---|---|
| Ground | `#c67864`, with patches of `#b16858` / `#a26757` |
| Shadows | `#593c3f` (cool, purple-brown, never black) |
| Boulders, lit side | `#9f6c65` |
| Boulders, shaded side | `#493238` |
| Crystal rock | `#3b3846` |
| Crystals | `#98e8f5` |
| Buildings | white with navy `#2c3550` and yellow `#f2b630` bands |
| Pad | asphalt `#32313b` with a yellow `#d8a554` ring |
| HUD panels | navy `#1e2438` at about 92% opacity, 1 px lighter border |
| Toolbar | `#24293f` |
| Slots | `#303449` |
| Hotkey badges | blue `#61aaf9` |
| Accent (selection, path, valid placement) | cyan `#48e0f0` |

**Lighting.** A warm low sun from the upper left (shadows fall to the lower right). There is strong ambient and
sky fill, so shadow sides stay readable. Shadows are soft with grounded contact darkening under every object. There
is no visible sky: the ground fills the frame. A slight warm haze sits at the top of the frame.

**HUD.**
- Top-left: one navy pill with three resources (icon + number): crystals (white), water (blue) and energy (yellow).
- Top-right: a "SOL 07" chip with a sun icon. Below it, the objective row: a circle check, "Connect solar power"
  and a chevron.
- Bottom-centre: a toolbar of 5 slots (about 110x95 px), each with a 3D render of the building, a label and a blue
  number badge.
- Bottom-right: a square minimap (about 170 px) in navy with a rounded frame, showing the terrain, buildings,
  crystals and a cyan view arrow.

The type is a clean sans at 15-20 px. Panels have about 8 px radius. The HUD takes up less than 15% of the screen,
so the world stays dominant.

## 2. Asset mapping (reference element -> real asset)

Main set: **KayKit Space Base Bits** (one textured gradient atlas, white/grey/orange). The character is the
**KayKit Space Ranger** (same studio and rig-medium animations). **Kenney Space Kit** fills gaps (dish, crystals,
boulders, turret). Its materials are flat-colour and *unlit*, so they get normalised (see section 3).

| Reference element | Asset(s) | Notes |
|---|---|---|
| Hub dome (focal) | `kaykit/space-base-bits/basemodule-e` (octagon base + dome cap) | Scaled up; door faces the camera; cyan door light |
| Long habitat modules | `kaykit/space-base-bits/mobile-base-command`, `mobile-base-carriage` on `structure-low` legs | Approximates the reference's windowed modules on stilts |
| Connecting corridors | `kaykit/space-base-bits/tunnel-straight-a` | Chained end to end |
| Greenhouse dome | `kaykit/space-base-bits/eco-module` (glass) or `basemodule-*` + `dome` (glass) over `space-farm-large` | Glass dome with plants |
| O2 tanks | `kaykit/space-base-bits/eco-module` / Kenney `rocket-fuel-b` | No tall white "O2" capsule exists; approximated |
| Satellite dish | `kenney/space-kit/satellite-dish-large` | Recoloured to the base palette |
| Solar arrays | `kaykit/space-base-bits/solarpanel` x2 per frame | Arranged as pairs on a frame |
| Power cable + box | Procedural low-poly conduit (dark tube + yellow clamps) + `kenney/space-kit/machine-generator` | No cable model in the packs |
| Landing pad | `kaykit/space-base-bits/landingpad-large` | Scaled to about 15 m |
| Dropship | `kaykit/space-base-bits/dropship` | |
| Pad lamps | `kaykit/space-base-bits/lights` | At 4 pad corners with emissive heads |
| Supply crates | `kaykit/space-base-bits/cargo-a-stacked`, `cargo-b-packed`, `containers-*` | Grouped by the pad and the hub |
| Rover | `kaykit/space-base-bits/spacetruck-large` (or `mobile-base-*`) | Selection ring + dashed route |
| Crystal deposit | `kenney/space-kit/rock-crystals-large-a/b`, `rock-crystals` | Rock recoloured to slate `#3b3846`; crystals cyan, emissive |
| Astronauts | `kaykit/mystery-monthly-series-4/space-ranger/character/space-ranger` + rig-medium clips | One character style for every person |
| Boulders (frame) | `kenney/space-kit/meteor`, `meteor-detailed`, `rock-large-a/b`, `kaykit/space-base-bits/rocks-b` | Recoloured to the boulder palette |
| Pebbles | `kaykit/space-base-bits/rock-a`, `rock-b`, `kenney/space-kit/rocks-small-a/b` | `NK3D.instances`, fixed seed |
| Craters | Shaped into the terrain mesh (rim + bowl) | Reads better than prop craters |
| Ground | Procedural low-poly plane (faceted, vertex colours from the palette) | Large enough to run past the camera |
| Toolbar buildings | Habitat `basemodule-b`, Solar Panel `solarpanel` pair, Oxygen Tank (as above), Storage `cargodepot-a`, Defense `kenney/space-kit/turret-single` | Icons rendered in-engine from the same models |

## 3. Normalisation rules

- **Scale.** The astronaut was planned at 1.8 m and raised to 2.2 m in review cycle 2: the Space Ranger's chibi
  proportions need it to read at this camera distance. KayKit base pieces are scaled x3.4 so module doors are
  about 2.4 m and the hub is about 8.6 m across. Kenney space-kit pieces (about
  1 m units) are scaled to the same real-world sizes by target height (`NK3D.model(key, { height })`).
- **Materials.**
  - Every Kenney `MeshBasicMaterial` (unlit) becomes `MeshStandardMaterial`, with roughness 0.8 and metalness 0, so
    it takes the same sun, sky and shadows as KayKit.
  - Kenney colours are remapped by material name to the shared palette:
    - `rock*` to ground or boulder tones
    - `crystal` to cyan with emissive
    - `metal` to off-white
    - `metalDark` to light grey
    - `dark` to navy
    - `metalRed` to the yellow accent
  - Glass (KayKit `Glass`) gets one shared glass material.
- **Lighting.** One warm sun, one hemisphere fill (lavender sky, terracotta ground bounce) and a light environment
  map. No point lights except the emissive look of lamps.
- **Tone.** ACES tone mapping at moderate exposure. A distance fog in the ground colour hides the plane's edge.

## 4. Gameplay in this slice

- **Build.** Select a toolbar slot (click, tap or 1-5). A ghost preview follows the cursor on a 1 m grid. The ring
  and footprint show cyan with a check when the spot is valid and red/orange with a cross when it is invalid
  (shape and colour, not colour alone). Place with a click or tap; resources are spent. R rotates the ghost.
  Esc or right-click cancels.
- **Rover.** Click the rover, then the crystal deposit (or press the "Send rover" action). A dashed cyan route
  appears. The rover drives out, mines, and returns along the path, then crystals are added.
- **Objectives.**
  1. Connect solar power: build a Solar Panel on the marked socket at the end of the cable. The cable lights up
     and energy starts flowing.
  2. Send the rover to the crystals.
  3. Build an Oxygen Tank.
  4. Build a Habitat. Then the colony is established.
- **Time.** Sols advance every 40 s. Energy and water tick in from the buildings.

## 5. Changes made during the build (asset list as shipped)

Visual tests in the asset lab (`dev/lab.html`) and three review cycles changed some of the planned mapping.

- **Hub.** `basemodule-e` is atlas-swapped: its gold swatch becomes a navy gradient (`atlasVariant("navy")`).
- **Long modules.** `mobile-base-carriage` and `mobile-base-command` sit on the ground, without `structure-low` legs.
  The legs read as red scaffolding at this scale.
- **Greenhouse.** `basemodule-b` (flattened to 32% height) + `space-farm-large` + the glass `dome`. The `eco-module`
  glass cylinder was too tall.
- **O2 tanks.** `water-storage` ×3 stacked, atlas-swapped orange → white, on a `roofmodule-base` plinth. The Kenney
  rocket drums read as rockets.
- **Landing pad.** `landingpad-large` (×6, 2.4, 6) with its orange skirt swapped to white, plus a yellow ring decal.
  The `dropship` is ×3.7.
- **Lamps.** `kenney/racing-kit/light-post-large` floodlights facing the pad, plus glow sprites. KayKit `lights`
  read as pinwheels from above.
- **Rover.** `mobile-base-frame` (6 named wheels, spun while driving) + a `mobile-base-command` cab.
- **Crystal deposit.** KayKit forest boulders in colour 4 (slate) with 14 `kenney/tower-defense-kit/detail-crystal`
  shards overridden to one emissive cyan material. Kenney's `rock-crystals` had tiny crystal cubes.
- **Boulders and mid-size rocks.** KayKit Forest Nature Pack `rock-3-*` in colour 3, multiplied by `0xf2c9c2`
  (mauve). Kenney meteors read as cubes, and colour 2 was too red.
- **Pebbles.** KayKit `rock-a/b` with cool grey tints, plus Kenney `rocks-small-a/b` in the slate look, instanced.
- **People.** Space Ranger + `space-ranger-helmet` on the `head` bone + `space-ranger-jetpack` (wings hidden) on
  `chest`, at 2.2 m.
- **Supplies.** `cargo-a/b` stacks with red → navy atlas swaps, plus `containers-*` barrels.
- **Toolbar buildings:**
  - Habitat: `basemodule-b` + small glass dome
  - Solar Panel: `roofmodule-solarpanels`
  - Oxygen Tank: the white water-tank stack ×2
  - Storage: `cargodepot-a` (navy cargo)
  - Defense: `kenney/space-kit/turret-single`
- **Sound.**
  - Music: `kenney/music-loops/space-cadet`
  - UI and feedback: `kenney/interface-sounds/*` (click, error, confirmation, glass, bong)
  - Build, power, laser and impact: `kenney/sci-fi-sounds/*`

All 63 locked ids (56 game ids + the kit's 7 touch-art ids) are CC0, checked against the lock. Every asset is CC0.
