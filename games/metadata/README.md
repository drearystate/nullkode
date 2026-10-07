# Asset metadata (CC0 packs)

Made for the 65,993 Kenney, KayKit, Quaternius and Pixel Frog assets in the packs below; `setup-library.sh` installs it.

| File | What |
|---|---|
| `tags-cc0.jsonl.gz` | AI tags, one JSON object per asset: name, description, style, view, roles, tags, usage note (65,993 rows) |
| `cards-cc0.json.gz` | Set cards: a summary of each pack and its full card page (322 sets) |
| `catalog-cc0.jsonl.gz` | The catalog these were made from (ids, files, metrics). `ingest.py` makes your own; this one is for reference |

Made from:

- `kenney`: Kenney Game Assets All-in-1 3.7.0 (58,012 assets)
- `kaykit`: The Complete KayKit Collection v7 (5,118 assets)
- `quaternius`: Quaternius low-poly packs (50 packs) (2,601 assets)
- `pixel-frog`: Pixel Frog: Kings and Pigs + Pixel Adventure 1 (262 assets)

Tags are matched by asset id. Ids come from the folder and file names in the zips, so the
Kenney and KayKit bundles give exactly these ids, and single Kenney and KayKit packs match where
their folder names are the same. Quaternius and Pixel Frog zips are matched by pack name
(`ingest/packs.json` lists the packs), so each one you have gets its tags. Assets without tags
get tags made from their file names.
