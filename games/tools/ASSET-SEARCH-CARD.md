# Asset search card

Assets: Kenney, KayKit, Quaternius (3D, many rigged + animated) and Pixel Frog
(pixel art), all CC0. Ids look like `<pack>/<set>/.../<name>`. Put ids in
`NK.assets.define({...})`; the platform writes the lock (never hand-write URLs or `assets.lock.json`).

## Commands (one line per asset: `id | name | kind style view | metrics | use note`)
```
asset-search --sets "medieval dungeon 3d"          # 1. pick ONE set (card summary per line)
asset-search --set kaykit/dungeon-pack ["wall"]     # 2. list the set (optionally narrowed)
asset-search "wall corner" --pack kaykit/dungeon-pack
asset-search "coin pickup sound" --audio --limit 5
asset-search --similar <id>     # neighbours / variants
asset-search --get <id>         # full record: frameNames, clips, tags, urls
asset-search --check <id> ...   # style / scale / licence warnings
```
Filters: `--kind`, `--style pixel|pixel-1bit|pixel-8bit|flat-vector|cartoon-hd|hand-drawn|low-poly|voxel`,
`--view side|top-down|three-quarter|isometric|3d|flat-ui`, `--2d --3d --audio --animated --rigged --tile 16
--exportable --limit N --desc`. JS: `search, listSet, similar, checkStyle, searchSets, getAsset` from
`nk-games/tools/asset-search.mjs`.

## Choosing
- Set first: one main art set per game, plus UI, audio and font. Read its card
  `/game-assets/_cards/<pack>/<set>.md` (pieces, grid, pivots, combos) before building.
- Never mix style families in the world (pixel / smooth 2D / hand-drawn / 3D). 1-bit and colour pixel art clash,
  and so do different tile sizes. Run `--check` on the final ids and fix every warning.
- Licence: assets that are not redistributable are for games hosted on this server only. For exported, open-source or
  downloadable games use `--exportable`. Prefer CC0 when there is a choice.
- `atlas <atlasId>#<frame>` in a line means the image is also an atlas frame: load the atlas once and use the frame.

## In the kits
- phaser-2d: a `spritesheet` is an atlas (frame names come from `--get`). A `tileset` gives the tile size and spacing.
  An `animation` is a frame strip that loops under its key. For pixel art, set `pixelArt: true` and scale by whole
  numbers. Use notes say which way a sprite faces.
- three-3d: sizes are in metres, Y-up, with the pivot printed (`base-centre` sits on the floor). Scales differ between
  kits (KayKit characters are about 2.3 m and its walls 4 m; many Kenney kits use 1 m tiles), so match them with
  `NK3D.model(key, { height })`. Snap modular pieces to the card's grid and use `NK3D.instances` for repeats.
- Rigged KayKit characters list `clips: <pack ids>`. Define those packs too and pass their keys to
  `NK3D.character({ clips })`; the clip names are in `--get`.
- Audio: one id gives ogg + mp3. `music-loop` tracks are 8 s or longer; jingles play once. For repeated sfx, rotate
  2-4 variants and vary the rate between 0.9 and 1.1.

## Tips
Use concrete nouns plus a style or view word ("pixel knight walk", "low-poly pine tree", "top-down car"). If results
are weak, drop words or add `--kind`. Names and notes come from an AI pass over the previews; open
`/game-assets/_previews/<id>.webp` when it matters.
