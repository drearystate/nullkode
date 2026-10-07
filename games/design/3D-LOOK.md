# 3D LOOK (lessons from the three showcase games: village builder, Mars base, dungeon)

## Camera
- Strategy/builder/diorama views: write the game's own rig and set `scene.world.rig` (the kit's rigs follow a hero). Long lens reads near-isometric: perspective `fov` 26-28 at 30-90 m, or an orthographic camera ~24 m wide. Pitch 33-40°. Yaw is a choice, not 45° by default: pick it so the main axis of the layout runs at a pleasing slope and nothing important sits under the HUD.
- Action views: frame AHEAD of and below the hero (hero at ~40% of frame height) so the goal stays in view; clamp focus to level bounds so the void never shows; return `yaw + π` from `moveYaw()` so W is "up the screen".
- Clamp pan/zoom so the world's edge never shows at any zoom or corner. Portrait: pull back, keep ≥ 60% of the width.
- Every new objective frames its target above the toolbar (check at 844×390).

## Lighting (no post-processing in the kit)
- One warm sun casting the only shadow map + a cool hemisphere fill. Ratio ~4-6 : 0.6 so shadow sides stay coloured (purple-brown, navy), never black.
- Fit the shadow camera to the visible ground every frame (follows target and zoom): sharp shadows with a modest map.
- Soft radial contact-shadow decals (one instanced batch) under every building, prop and character. This grounds the scene as much as the sun shadow, and is all phones get.
- `toneMapping: "neutral"` keeps saturated accents; ACES washes out greens/oranges. Torchlight = golden (0xffa24a), not pure orange (turns stone pink).
- ≤ 4 point lights: pool 3 real lights onto the sources nearest the focus (fade, move, fade in); fake the rest with emissive meshes, additive halo points and radial light-pool decals on floor and wall.
- Fog in the background colour, distance tied to zoom: the play area is never hazed, the far edge always is.

## One palette across packs
- Choose ONE self-consistent base set (e.g. a KayKit pack) and treat other packs as small accents normalised into it.
- KayKit models sample a small gradient atlas: recolour by repainting atlas swatches on a canvas once at load (or a cloned atlas per variant), never per-mesh hacks. One shared material for the whole set where possible.
- Kenney GLBs: flat named colours with default metalness 1 (look chrome): rebuild by material name into matte standard materials from one PALETTE.
- Everything matte (roughness ≥ 0.7, metalness 0) so no asset looks glossier than its neighbours.
- Reserve accent colours for meaning (selection/valid = cyan or gold; danger/invalid = red/orange + a shape).

## Scale and pivots
- Work in metres with explicit target sizes (door ~2.4 m, people 2.0-2.5 m, KayKit floor 2 m, wall module 4 m). One rule for scaling standing objects, applied everywhere.
- Re-centre every model to base-centre before scaling: packs mix pivots, and a ×8 rock otherwise drifts metres off its spot.
- Non-square pieces: scale the pack's own blocks non-uniformly; never untextured primitives in place of art.
- GLTFLoader renames bones (`handslot.r` → `handslotr`): attach gear by the renamed name.

## Composition
- Layout is data in `src/levels.js`, in metres, deterministic from one seed. Check it top-down against the camera footprint and HUD zones.
- One focal point (landmark/goal with the brightest light), one readable route kept clear, props in functional groups (stores by doors, lamps facing the pad, panels along the cable). No random scatter: per-object prop lists with tiny seeded jitter, hand-placed vignettes for gaps, scatter only with keep-out zones.
- Large forms frame the corners, medium near buildings, small accents sparse. Far walls tall, near walls low. Something beyond the edges (terrace, forest, plain) so the world doesn't end at the frame.

## Interface
- Render HUD/toolbar icons from the game's own models at load (corner of the canvas, read back): they match the world's light and palette exactly.
- Theme the kit's menu/pause/settings via CSS on its classes in the same palette as the HUD.
- Placement previews: valid and invalid differ by colour AND shape (ring + check vs hatched disc + cross), and the tip says why.

## Performance
- Bake static set pieces to world space and merge per material (per 20 m chunk): ~300 → ~120-165 draws. Merge skinned character parts into one skinned mesh. Deep-forest/small props cast no shadow; thin scatter on Low.

## Review
- Screenshot at 1600×900 and 844×390 with real input; also zoom in on close-ups for floating, clipping and scale errors. Name the 3 most visible problems, fix, shoot again.
- Joins: zoom in on every piece that connects two things (bridge to the road on each bank, road and river tiles to each other, doors to paths, walls at corners, cables to sockets) and check that it meets both ends square-on. Models from tile packs are authored in the tile frame (hex packs: pointy-top, odd multiples of 30°), so rotate them like the tiles, not like buildings; a 30° error reads as broken at once. Check it also for pieces the player places, not only the starting layout.
