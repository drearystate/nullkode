# Hearthvale: visual spec + asset list

A small medieval village diorama on a hex grid, built with the NullKode 3D kit (three-3d@1.1.0, the Game Studio's
current kit) and CC0 KayKit + Kenney assets from the NullKode asset library. One finished, composed area and one
interaction: choose a building in the toolbar, see a placement preview on the hex under the pointer, then place it.

Visual target: the owner's reference image (`../references/village.png`). We follow its framing, HUD layout and
palette, not its content: we only use what the library actually has.

## Look
- Chunky low-poly hex diorama: 2 m hex tiles on a flat-top grid; everything standing is enlarged ×1.4 so a cottage
  fills about half its hex.
- Palette hierarchy (after the repaint, before lighting):
  - greens dominate: grass tops `#709947`, pine foliage `#84bd6a → #1f4a33`, darker/cooler forest floor
  - the village reads warm: cream plaster `#fffaf0 → #cdb795`, warm stone `#f6ecd5 → #7c6f60`, terracotta roofs
    `#f2a477 → #8c3f25`, timber `#b98d68 → #5a3a27`, cobbled square `#e6dbc2`-ish stones on `#a6977b` grout
  - blue contrast only from the river: `#8fd2ee → #24609c`
  - gold `#e2b04a` only for selection, the active tool / speed and goal states
- Matte everywhere: roughness 1, metalness 0, a little environment fill (0.22). No noisy textures: the KayKit packs
  use flat gradient palettes.
- Faceted foliage: smooth-shaded plants (round pines, bushes, lettuce) are drawn with flat shading to match the
  faceted pines.
- Light: one warm afternoon sun (`#ffd9a6`, 2.25, from the south-west at ~37°), soft PCF shadows (radius 2.6,
  88% strength so shade keeps detail) fitted to the camera view every frame, sky/ground hemisphere fill, tone mapping
  "neutral" (keeps hues, no clipping). No fog, no bloom, no blur; a very soft vignette frames the village.
- Grounding: soft blob contact shadows under buildings, trees and villagers (the kit has no SSAO).

## Camera
- Orthographic, pitched 40° down, yawed -18° so river, roads and grid read diagonally.
- Default view 24 m wide at 16:9: the settlement fills most of the frame, forest ring + river around it.
- Drag to pan, wheel / pinch to zoom (11-32 m wide), clamped so the world's edge never shows.
- Portrait phones see at least 64% of that width (taller view); the HUD re-flows into two rows.

## Layout (flat-top hex grid; screen: west/river left, east/windmill right, north up)
- Market square: 5 cobbled hexes left of centre with a well, market stall, merchant cart, benches, crates, baskets.
- Landmark: the town hall (clock tower) on the square's north side.
- River: enters top-left, bends towards the village at the bridge, leaves bottom-left; reeds at the water's edge,
  lilies, a pallet jetty with a moored boat.
- Bridge: the west road crosses it to a wooded path and the lumber camp in a clearing (log piles, stumps).
- Windmill (sails to the viewer) + four walled wheat fields + granary east of the square; hay meadow below.
- Homes: a dense cluster north-east (with the smithy), a riverside pair, a southern group; walled back gardens,
  vegetable beds, wood piles, barrels, benches, bushes.
- Paths: square → bridge → lumber camp; square → windmill; square → jetty.
- Forest: dense ring of faceted pines with noise-shaped edges, clearings, rocks and stumps; deeper forest is darker.
- Six villagers (KayKit farmers) walk the roads to the fields, lumber camp, jetty and homes and work there.

## Scale normalisation
- Base unit = KayKit hex pack (tile 2 m). STAND = 1.4 for everything that stands on the ground.
- Character-scale KayKit sets (farmers, resource-bits, forest-nature, dungeon bench) ×0.2-0.4 first, then ×1.4:
  villager 0.71 m, cottage 1.3 m, pine 1.5-2 m, windmill 2.4 m.
- Garden walls sit on hex edges: they keep their length and only get taller.
- Everything is placed from its bbox on y = 0 (tile top); the square is raised 5 cm, the jetty 10 cm.

## Interface
- Compact cream panels (`#f7eedb`, 1.5px `#d8c6a0` border, 12 px radius, soft shadow), navy text `#1f2a44`, the kit's
  Kenney Future font. The kit's menu / pause / settings panels use the same theme.
- Top-left: wood, stone, food, gold, villagers (icons rendered at load from the game's own models); under it the
  navy goal chip with a checkbox ("Build a windmill").
- Top-right: day + pause / play / fast + menu (opens the kit's pause menu with Settings).
- Bottom-centre: House, Farm, Windmill, Lumber Camp, Well, Bridge cards (model-rendered icons, keys 1-6), gold ring on
  the selected one; a tip above shows cost, the preview's verdict and a cancel button.
- Placement: ghost + hex ground outline. Valid = solid gold outline + cream ghost; invalid = dashed brick outline +
  red ghost + the reason. Mouse: hover + click. Touch: first tap previews, second tap builds.
- Building pops in (ease-out-back) with a dust ring, wood thud and a pizzicato jingle.

## Asset list (all CC0, 78 ids)
| Role | Library id(s) |
|---|---|
| Ground | kaykit/medieval-hexagon-pack/tiles/base/hex-grass; tiles/roads/hex-road-a…g, m; tiles/rivers/hex-river-a, a-curvy, b, c |
| Buildings | kaykit/medieval-hexagon-pack/buildings/red/building-{home-a,home-b,townhall,market,windmill,well,lumbermill,blacksmith,stables}-red |
| Neutral | buildings/neutral/building-{bridge-a,grain,dirt}, fence-stone-straight |
| Nature | decoration/nature/tree-single-a, tree-single-b, tree-single-a-cut, rock-single-a…e, waterplant-b, waterlily-a/b |
| Props | decoration/props/{barrel,crate-a-big,crate-b-small,crate-long-a/b/c,haybale,sack,resource-lumber,resource-stone,wheelbarrow,bucket-water,boat,trough-long,flag-red,pallet}; units/neutral/{cart-merchant + its two axles, horse-b} |
| Accents | kaykit/forest-nature-pack/color3/bush-1-b-color3; kaykit/dungeon-pack/bench; kaykit/resource-bits/{food-basket-a-berries,food-flour,wood-log-stack (HUD icon)}; kaykit/mystery-monthly-series-6/farmers/{dirt-plot,lettuce}; kaykit/board-game-bits/coin-10-gold (HUD icon) |
| Villagers | kaykit/mystery-monthly-series-6/farmers/characters/farmer-a, farmer-b; kaykit/skeletons/animations/rig-medium/rig-medium-{general,movement-basic}; kaykit/character-animations/animations/rig-medium/rig-medium-tools |
| Audio | kenney/music-loops/loops/farm-frolics; kenney/interface-sounds/click-001, error-001; kenney/impact-sounds/impact-wood-heavy-000/001; kenney/music-jingles/audio-pizzicato/jingles-pizzicato-00/02; kenney/rpg-audio/handle-coins |

Tried and dropped: the KayKit dock (a raised wharf for coast tiles, reads wrong on a river bank → pallet jetty),
Kenney Nature Kit flowers (read as confetti at this scale), city-builder bench/bush (too thin / too dark).
