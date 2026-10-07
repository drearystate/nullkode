# Game Studio files

What the Game Studio needs besides the app itself. Setup: `docs/games.md`.

| Folder | What it is |
|---|---|
| `engine/kits/` | The engine kits games run on (Phaser 2D, three.js 3D), every version. Served at `/nk-engine/`. |
| `design/` | The game design playbook the AI follows: core rules, art direction, one card per genre, the playtest checklist. |
| `tools/` | Asset search (`asset-search`, `asset-search.mjs`) and the search index builder (`build-index.py`). |
| `ingest/` | Turns the downloaded Kenney, KayKit, Quaternius and Pixel Frog zips into the asset library (`prepare-packs.py`, `ingest.py`). |
| `tagging/` | Optional: AI tags and set cards for assets the shipped tags don't cover, through any OpenAI-compatible API. |
| `metadata/` | AI tags, descriptions and set cards for the 65,993 CC0 Kenney, KayKit, Quaternius and Pixel Frog assets, plus their catalog. |
| `setup-library.sh` | Builds the library from your zips in one go. |

Made on your computer and never committed (see `.gitignore`):
`packs/` (the zips you download), `work/` (scratch space) and `library/` (the
built asset library).

Licences: `THIRD-PARTY-NOTICES.md`.
