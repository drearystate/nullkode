#!/usr/bin/env bash
# Builds the Game Studio's asset library from the CC0 zips you downloaded
# (Kenney, KayKit, Quaternius, Pixel Frog), then adds the AI tags that ship
# with NullKode and builds the search index. See docs/games.md.
#
#   bash games/setup-library.sh            (zips in games/packs/)
#
# Settings (all optional):
#   NK_GAME_PACKS   folder with the downloaded zips      (default games/packs)
#   NK_GAME_ASSETS  where the library is built           (default games/library)
#   NK_GAMES_WORK   scratch space, several GB            (default games/work)
#   NK_BLENDER      Blender 4.x, for 3D models            (default: blender on PATH)
#   NK_WORKERS      parallel jobs                         (default 16)
# Safe to run again: finished work is kept and only new or changed assets are processed.
set -euo pipefail
GAMES=$(cd "$(dirname "$0")" && pwd)
export NK_GAME_PACKS=${NK_GAME_PACKS:-$GAMES/packs}
export NK_GAME_ASSETS=${NK_GAME_ASSETS:-$GAMES/library}
export NK_GAMES_WORK=${NK_GAMES_WORK:-$GAMES/work}
mkdir -p "$NK_GAME_PACKS" "$NK_GAME_ASSETS" "$NK_GAMES_WORK"

missing=()
for tool in python3 node npm unzip ffmpeg ffprobe; do command -v "$tool" >/dev/null || missing+=("$tool"); done
python3 -c 'import PIL, numpy' 2>/dev/null || missing+=("python3 Pillow and numpy (pip install pillow numpy, or apt install python3-pil python3-numpy)")
blender=${NK_BLENDER:-$(command -v blender || true)}
[[ -n "$blender" && -x "$blender" ]] || missing+=("Blender 4.x (https://www.blender.org/download/), or set NK_BLENDER to its path")
if ((${#missing[@]})); then
  echo "Install these first:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi
export NK_BLENDER=$blender
node -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' || { echo "Node.js 20 or newer is needed." >&2; exit 1; }

echo "== Installing the pipeline's Node packages"
# Only when missing or older than the lockfile (the search package compiles SQLite when no prebuilt one fits).
for dir in ingest tools; do
  if [[ ! "$GAMES/$dir/node_modules/.package-lock.json" -nt "$GAMES/$dir/package-lock.json" ]]; then
    (cd "$GAMES/$dir" && npm ci --no-audit --no-fund --loglevel=error $([[ $dir == tools ]] && echo --omit=dev))
  fi
done

echo "== Preparing the packs in $NK_GAME_PACKS"
python3 "$GAMES/ingest/prepare-packs.py" "$NK_GAME_PACKS"

echo "== Building the library in $NK_GAME_ASSETS (the first run with everything can take a few hours)"
for stage in unpack scan process catalog; do
  nice -n 10 python3 "$GAMES/ingest/ingest.py" "$stage"
done

echo "== Adding the shipped AI tags and set cards"
python3 - "$GAMES/metadata" "$NK_GAME_ASSETS" <<'PY'
import gzip, json, os, sys
meta, lib = sys.argv[1], sys.argv[2]
marker = os.path.join(lib, '.tags-from-release')
tags = os.path.join(lib, 'tags.jsonl')
ids = set()
with open(os.path.join(lib, 'catalog.jsonl'), encoding='utf-8') as fh:
    for line in fh:
        ids.add(json.loads(line)['id'])
if os.path.exists(tags) and not os.path.exists(marker):
    print('  %s exists and was not written by this script: kept as it is' % tags)
else:
    n = hit = 0
    with gzip.open(os.path.join(meta, 'tags-cc0.jsonl.gz'), 'rt', encoding='utf-8') as src, \
            open(tags + '.tmp', 'w', encoding='utf-8') as out:
        for line in src:
            n += 1
            if json.loads(line)['id'] in ids:
                out.write(line)
                hit += 1
    os.replace(tags + '.tmp', tags)
    open(marker, 'w').close()
    print('  AI tags for %d of the %d assets in your library (%d shipped); the rest use tags made from file names'
          % (hit, len(ids), n))
cards_dir = os.path.join(lib, '_cards')
os.makedirs(cards_dir, exist_ok=True)
with gzip.open(os.path.join(meta, 'cards-cc0.json.gz'), 'rt', encoding='utf-8') as fh:
    bundle = json.load(fh)
sets = {i.split('/', 2)[0] + '/' + i.split('/', 2)[1] for i in ids if i.count('/') >= 2}
rows = [c for c in bundle['cards'] if c['set'] in sets]
with open(os.path.join(cards_dir, 'cards.json'), 'w', encoding='utf-8') as fh:
    json.dump(rows, fh, ensure_ascii=False, indent=0)
for rel, text in bundle['pages'].items():
    if rel.rsplit('.', 1)[0] in sets:
        path = os.path.join(cards_dir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(text)
print('  %d set cards' % len(rows))
PY

echo "== Building the search index"
nice -n 10 python3 "$GAMES/tools/build-index.py"
node "$GAMES/tools/asset-search" "coin pickup sound" --limit 3

cat <<EOF

Done. The library is in $NK_GAME_ASSETS
Docker: nothing to set if it is games/library; otherwise set NK_GAME_LIBRARY=$NK_GAME_ASSETS in .env.
Without Docker, add these to .env and restart NullKode:
  NK_GAME_KITS=$GAMES/engine/kits
  NK_GAME_DESIGN=$GAMES/design
  NK_ASSET_SEARCH=$GAMES/tools/asset-search.mjs
  NK_GAME_ASSETS=$NK_GAME_ASSETS
The scratch folder $NK_GAMES_WORK can be deleted now (keep it to make later runs faster).
EOF
