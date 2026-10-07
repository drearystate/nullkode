# Games (Game Studio)

The Game Studio builds 2D and 3D browser games from a description. The AI
writes a short plan, then builds the game one step at a time while the canvas
shows it growing. Every step is checked in a headless browser and play-tested
against a game-design playbook (feel, readability, difficulty, phone controls),
and every version can be restored. 2D games run on Phaser, 3D games on three.js
with Rapier physics. A finished game is published like any app, or downloaded
as a zip that runs on any static web host.

Games are made from a library of free CC0 assets: about 66,000 sprites, 3D
models (many rigged and animated), sounds, music and fonts from Kenney, KayKit,
Quaternius and Pixel Frog, each tagged by AI so the AI builder can search them. It works with any supported model; larger models
make better games.

This page is for people who run their own NullKode server.

## What it needs

| Part | Where it comes from |
|---|---|
| Engine kits, design playbook, asset search | `games/` in this repository |
| AI tags and set cards for the CC0 assets | `games/metadata/` in this repository |
| The asset files (about 2.5 GB) | You download the free packs and build the library once (below) |

The asset files are not in the repository: they are large, and the
publishers ask people to download them from their own sites. Until the library
is built, the Game Studio says it isn't set up yet; everything else works.

## Set up

### 1. Download the packs

All of them are CC0 (public domain): free for any use, including commercial
games.

- **Kenney**: every pack is free at [kenney.nl/assets](https://kenney.nl/assets).
  Kenney also sells all of them as one download, "Kenney Game Assets
  All-in-1", at [kenney.itch.io/kenney-game-assets](https://kenney.itch.io/kenney-game-assets),
  which supports the author.
- **KayKit** (by Kay Lousberg): the packs are at
  [kaylousberg.itch.io](https://kaylousberg.itch.io) (most have a free
  version), or all of them as "The Complete KayKit Collection" at
  [kaylousberg.itch.io/kaykit-complete](https://kaylousberg.itch.io/kaykit-complete).
- **Quaternius**: low-poly 3D packs, many with rigged and animated characters,
  at [quaternius.com](https://quaternius.com). Each pack page has a download
  link; keep the zips' names as they are. The shipped AI tags cover the 50
  packs listed in `games/ingest/packs.json` (`"zips"` under `quaternius`).
  Quaternius releases some newer packs under its own licence, which allows
  using them in games but not sharing the files. Those zips are skipped, since
  this library only takes CC0 packs.
- **Pixel Frog**: pixel-art platformer packs at
  [pixelfrog-assets.itch.io](https://pixelfrog-assets.itch.io): Pixel
  Adventure 1 and 2, Kings and Pigs, Treasure Hunters and Pirate Bomb. The
  shipped AI tags cover Pixel Adventure 1 and Kings and Pigs. Packs on that page
  that aren't CC0 are skipped.

You can take everything or only the packs you want. The shipped AI tags match
the All-in-1 3.7.0 bundle, the Complete KayKit Collection v7, and the
Quaternius and Pixel Frog packs by name. Single Kenney and KayKit packs match
wherever their names are the same as in the bundles. Assets without AI tags
still get tags made from their file names, so they can be found.

Put the zips, as downloaded, in `games/packs/`.

### 2. Install the tools (on the server itself, also with Docker)

Python 3 with Pillow and numpy, Node.js 20 or newer, `unzip`, `ffmpeg` and
[Blender](https://www.blender.org/download/) 4.x (it converts and draws the 3D
models). On Debian or Ubuntu:

```bash
sudo apt install python3 python3-pil python3-numpy unzip ffmpeg
# Blender: download 4.x from blender.org, unpack it, then
export NK_BLENDER=/path/to/blender-4.x/blender
```

### 3. Build the library

```bash
bash games/setup-library.sh
```

It sorts and combines the zips (`games/ingest/prepare-packs.py`, which
also says which zips it skipped and why), unpacks them, converts every asset to
web formats with a preview picture (`ingest.py`), adds the shipped AI tags and
set cards, and builds the search index. The first run with everything takes a
few hours and needs about 15 GB of free space (zips included) while it works;
the finished library in `games/library/` is about 2.5 GB, and the scratch
folder `games/work/` can be deleted afterwards. Running it again only processes
what changed, so you can add packs later.

### 4. Start or restart NullKode

- **Docker:** `docker compose up -d`. `docker-compose.yml` sets the paths and
  mounts `games/library` into the app. A library somewhere else:
  `NK_GAME_LIBRARY=/path/to/library` in `.env`.
- **Without Docker:** add the four paths the script prints at the end to `.env`
  (absolute paths), then restart the app.

Open the Game Studio and describe a game.

## Settings

| Variable | What | Docker sets it to |
|---|---|---|
| `NK_GAME_KITS` | Engine kits folder | `/app/games/engine/kits` |
| `NK_GAME_DESIGN` | Design playbook folder | `/app/games/design` |
| `NK_ASSET_SEARCH` | Asset search module | `/app/games/tools/asset-search.mjs` |
| `NK_GAME_ASSETS` | The built asset library | `/app/games/library` |
| `NK_ASSET_INDEX` | Search index, if not `<library>/_index/assets.db` | `/app/games/library/_index/assets.db` |
| `NK_GAME_LIBRARY` | Docker only: the library folder on this computer | `./games/library` |
| `NK_GAME_CHECK` | `off` skips the headless-browser check of each step | (unset: on) |

`games/setup-library.sh` also reads `NK_GAME_PACKS` (the zips, default
`games/packs`), `NK_GAMES_WORK` (scratch space, default `games/work`),
`NK_BLENDER` and `NK_WORKERS` (parallel jobs, default 16).

The app serves the engine kits at `/nk-engine/` and the assets at
`/game-assets/` itself, so nothing else is needed behind the bundled Caddy or
any other proxy. On a busy server you can let your web server serve
`/game-assets/` straight from the library folder; serve only the asset file
types (models, images, audio, fonts, atlas `.json`/`.xml`), never `_index/`,
`catalog.jsonl` or `packs.json`, and allow cross-origin requests, because games
on app domains load them.

## Tagging new assets (optional)

The shipped tags cover the Kenney and KayKit bundles and the Quaternius and
Pixel Frog packs in `games/ingest/packs.json`. To tag assets they don't cover, `games/tagging/` asks any OpenAI-compatible API with a model that reads
images (a hosted model, or a local one through vLLM, llama.cpp or Ollama):

```bash
export NK_TAG_BASE_URL=http://127.0.0.1:11434/v1  NK_TAG_MODEL=<model>  NK_TAG_API_KEY=<key if needed>
python3 games/ingest/ingest.py sheets       # contact sheets for the AI to look at
python3 games/tagging/tag.py sheets         # then: tag.py audio, tag.py merge
python3 games/tagging/cards.py build        # set cards
python3 games/tools/build-index.py          # search index
```

Delete `games/library/.tags-from-release` first, or `setup-library.sh` will
replace `tags.jsonl` with the shipped tags next time.

## The official games

Hearthvale, Red Horizon and Vault of Embers are NullKode's own games. They are
played on nullkode.com and are not part of this release. What they taught the
Game Studio about 3D looks ships in `games/design/3D-LOOK.md`.

## Licences

- Kenney, KayKit, Quaternius and Pixel Frog assets: CC0 1.0. Credit is
  appreciated but not required.
- The engine kits include Phaser (MIT), three.js (MIT), Rapier (Apache-2.0)
  and the Draco and Basis decoders (Apache-2.0). Their notices are in
  `games/THIRD-PARTY-NOTICES.md` and in each kit's `licenses/` folder.
- The AI tags, set cards and everything else in `games/` are NullKode's (MIT).
- nullkode.com also uses two asset packs whose licences don't allow sharing
  their files. They are not part of this release, and nothing here needs them.

## Troubleshooting

- **"The Game Studio isn't set up"**: the app can't find the kits, the
  library's `catalog.jsonl` or the search module. Check the paths above (they
  must be absolute) and that `games/library/catalog.jsonl` exists.
- **Asset search fails**: `games/tools/node_modules` is missing (Docker builds
  it; without Docker run `npm ci --omit=dev` in `games/tools`), or the index
  isn't built (`python3 games/tools/build-index.py`).
- **A pack was skipped**: `prepare-packs.py` only takes CC0 zips from Kenney,
  KayKit, Quaternius and Pixel Frog, and prints why it skipped each other zip.
  Check that the zip opens and wasn't renamed from another publisher's pack. A
  Quaternius zip without a licence file is only taken if `packs.json` lists it;
  if its page on quaternius.com says CC0, add a `License.txt` saying so.
- **3D models missing**: Blender wasn't found. Set `NK_BLENDER` and run the
  script again; only the missing models are processed.
