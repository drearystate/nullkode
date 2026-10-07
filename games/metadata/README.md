# Asset metadata (CC0 packs)

Made for the 63,130 Kenney and KayKit assets in the bundles below; `setup-library.sh` installs it.

| File | What |
|---|---|
| `tags-cc0.jsonl.gz` | AI tags, one JSON object per asset: name, description, style, view, roles, tags, usage note (63,130 rows) |
| `cards-cc0.json.gz` | Set cards: a summary of each pack and its full card page (270 sets) |
| `catalog-cc0.jsonl.gz` | The catalog these were made from (ids, files, metrics). `ingest.py` makes your own; this one is for reference |

Made from:

- `kenney`: Kenney Game Assets All-in-1 3.7.0 (58,012 assets)
- `kaykit`: The Complete KayKit Collection v7 (5,118 assets)

Tags are matched by asset id. Ids come from the folder and file names in the zips, so the
bundles give exactly these ids; single packs from the publishers' sites match where their
folder names are the same. Assets without tags get tags made from their file names.
