"""Stage 7: REPORT.md - counts, sizes, conversions, failures, skips, verification."""
import collections
import json
import os
import time

from common import LIB, STATE, WORK, HERE, SHEETS, read_json

KIND_ORDER = ['model', 'sprite', 'spritesheet', 'animation', 'tileset', 'ui', 'icon', 'background', 'texture',
              'material', 'font', 'sfx', 'music']


def _mb(b):
    return '%.1f MB' % (b / 1e6) if b < 1e9 else '%.2f GB' % (b / 1e9)


def _du(path):
    t = 0
    n = 0
    for root, _, files in os.walk(path):
        for f in files:
            t += os.path.getsize(os.path.join(root, f))
            n += 1
    return t, n


def _model_bytes(models):
    plan = {}
    with open(os.path.join(WORK, 'plan.jsonl')) as f:
        for l in f:
            r = json.loads(l)
            if r['kind'] == 'model':
                plan[r['id']] = r
    out = {}
    for m in models:
        p = plan.get(m['id'])
        src = 0
        if p:
            base = os.path.join(WORK, 'unpacked', p['pack'])
            for rel in [p['src']['primary']] + p['src'].get('refs', []) + p['src'].get('anims', []):
                try:
                    src += os.path.getsize(os.path.join(base, rel))
                except OSError:
                    pass
        k = (m['pack'], m['metrics'].get('sourceFormat'))
        n, a, b = out.get(k, (0, 0, 0))
        out[k] = (n + 1, a + src, b + m['metrics'].get('bytesOut', 0))
    return out


def write(packs):
    recs = [json.loads(l) for l in open(os.path.join(LIB, 'catalog.jsonl'))]
    packs_json = read_json(os.path.join(LIB, 'packs.json'), {})
    failures = read_json(os.path.join(STATE, 'failures.json'), []) or []
    verify = read_json(os.path.join(STATE, 'verify.json'), {}) or {}
    skipped = [json.loads(l) for l in open(os.path.join(STATE, 'skipped.jsonl'))]
    orphans = read_json(os.path.join(STATE, 'orphans.json'), []) or []
    total_b, total_n = _du(LIB)
    prev_b, prev_n = _du(os.path.join(LIB, '_previews'))
    L = []
    L += ['# Game-asset ingest report', '',
          'Generated %s by `nk-games/ingest/ingest.py report`.' % time.strftime('%Y-%m-%d %H:%M'), '',
          '- Library: `%s` - %s in %d files (previews: %s in %d files)' % (LIB, _mb(total_b), total_n, _mb(prev_b), prev_n),
          '- Catalog: `%s/catalog.jsonl` - **%d assets**; `packs.json`, `README.md` alongside' % (LIB, len(recs)),
          '- Contact sheets: `%s/` (%d sheets, 6x5 previews, index in `sheets.json` / `index.jsonl`)' % (
              SHEETS, len((read_json(os.path.join(SHEETS, 'sheets.json'), {}) or {}).get('sheets', []))),
          '- Pipeline: `%s/` (`python3 ingest.py all`)' % HERE, '']
    # counts table
    kinds = [k for k in KIND_ORDER if any(r['kind'] == k for r in recs)]
    L += ['## Assets per pack and kind', '', '| pack | ' + ' | '.join(kinds) + ' | total | size on disk |',
          '|---|' + '---:|' * (len(kinds) + 2)]
    pj = {p['pack']: p for p in packs_json.get('packs', [])}
    for p in packs:
        c = collections.Counter(r['kind'] for r in recs if r['pack'] == p['slug'])
        L.append('| %s | %s | %d | %s |' % (p['slug'], ' | '.join(str(c.get(k, 0)) for k in kinds), sum(c.values()),
                                           _mb(pj.get(p['slug'], {}).get('bytesOnDisk', 0))))
    c = collections.Counter(r['kind'] for r in recs)
    L.append('| **all** | %s | **%d** | %s |' % (' | '.join(str(c.get(k, 0)) for k in kinds), len(recs), _mb(total_b)))
    L += ['', 'Licences: kenney and kaykit are `cc0` (redistributable).', '']
    # conversions
    models = [r for r in recs if r['kind'] == 'model']
    fmt = collections.Counter((r['pack'], r['metrics'].get('sourceFormat')) for r in models)
    bin_ = sum(r['metrics'].get('bytesIn', 0) for r in models)
    bout = sum(r['metrics'].get('bytesOut', 0) for r in models)
    rigged = sum(1 for r in models if r['metrics'].get('rigged'))
    animated = sum(1 for r in models if r['metrics'].get('clips'))
    scale_notes = [r for r in models if r['metrics'].get('scaleNote')]
    L += ['## Conversions', '', '### 3D -> GLB', '']
    for (pk, f), n in sorted(fmt.items()):
        how = {'glb': 'pack GLB, optimised', 'gltf': 'glTF+bin+textures packed to GLB',
               'fbx': 'FBX converted with Blender headless', 'obj': 'OBJ+MTL converted with Blender headless'}.get(f, f)
        L.append('- %s: %d from %s (%s)' % (pk, n, f, how))
    L += ['- All GLBs: dedup + prune + resample, textures to lossless WebP (`EXT_texture_webp`), '
          '`EXT_meshopt_compression` with positions/normals left unquantized (node pivots unchanged). '
          'Each output was re-read after writing; triangle and clip counts must match the source.',
          '- Model bytes by source format (source = model file + its .bin/texture files; library = self-contained GLB):',
          ] + ['  - %s %s: %d models, %s -> %s' % (pk_, f_, n_, _mb(a_), _mb(b_)) for (pk_, f_), (n_, a_, b_) in sorted(_model_bytes(models).items())] + [
          '  (Packs share one palette texture across many models on disk; every GLB embeds its own lossless WebP copy '
          'so each file loads on its own.)',
          '- Rigged: %d, with animation clips: %d. Kenney "Animated Characters" packs: model FBX + separate animation '
          'FBX files merged into one GLB per body type with every clip; skins kept as `texture` assets '
          '(`metrics.skins` / `metrics.skinFor`).' % (rigged, animated),
          '- Scale: sizes are recorded as-is in metres (`metrics.bbox.size`, `maxDimM`); nothing was rescaled. '
          '%d models carry a `scaleNote` (suspiciously large/small).' % len(scale_notes), '']
    if scale_notes:
        L += ['  Examples: ' + ', '.join('`%s` (%s m)' % (r['id'], r['metrics'].get('maxDimM')) for r in scale_notes[:12]), '']
    img = [r for r in recs if r['kind'] in ('sprite', 'spritesheet', 'animation', 'tileset', 'ui', 'icon',
                                            'background', 'texture')]
    webp = sum(1 for r in img if 'webp' in (r['files'].get('alternates') or {}))
    svg_only = sum(1 for r in img if r['files']['primary'].endswith('.svg'))
    svg_alt = sum(1 for r in img if any(k.startswith('svg') for k in (r['files'].get('alternates') or {})))
    two_x = sum(1 for r in img if any(k in ('2x', '3x') or k.endswith('px') for k in (r['files'].get('alternates') or {})))
    atlases = [r for r in img if r['kind'] == 'spritesheet' and 'json' in (r['files'].get('alternates') or {})]
    grids = [r for r in img if r['metrics'].get('grid')]
    anims = [r for r in img if r['kind'] == 'animation']
    tiles = [r for r in img if r['kind'] == 'tileset']
    tsrc = collections.Counter(r['metrics'].get('paramsSource', 'unknown') for r in tiles)
    L += ['### 2D', '',
          '- %d raster/vector images; %d got a lossless WebP copy (kept only where smaller than the PNG)' % (len(img), webp),
          '- %d SVG-only assets (vector), %d raster assets with an SVG alternate, %d with @2x/size alternates' % (svg_only, svg_alt, two_x),
          '- %d Kenney TextureAtlas XML sheets parsed (%d frames) and also written as Phaser JSON-hash atlases' % (
              len(atlases), sum(r['metrics'].get('frames', 0) for r in atlases)),
          '- %d plain sheets with a detected frame grid (transparent gutters / square strip / sibling frame size)' % len(grids),
          '- %d animations grouped from %d numbered frame files (strip/grid PNG generated, frames kept)' % (
              len(anims), sum(r['metrics'].get('frames', 0) for r in anims)),
          '- %d tilesets; tile parameters from: %s' % (len(tiles), ', '.join('%s %d' % kv for kv in tsrc.most_common())), '']
    aud = [r for r in recs if r['kind'] in ('sfx', 'music')]
    clip = [r for r in aud if r['metrics'].get('clipping')]
    srcc = collections.Counter(r['metrics'].get('sourceCodec') for r in aud)
    L += ['### Audio', '',
          '- %d clips (%d sfx, %d music). Sources: %s. Every clip has .ogg (primary) + .mp3.' % (
              len(aud), sum(1 for r in aud if r['kind'] == 'sfx'), sum(1 for r in aud if r['kind'] == 'music'),
              ', '.join('%s %d' % kv for kv in srcc.most_common())),
          '- Obvious clipping (at 0 dBFS with flat-topped runs: astats peak count >= 100 or flat factor >= 5): %d -> loudness-normalised `.norm.ogg` copies' % len(clip)]
    if clip:
        L.append('  ' + ', '.join('`%s`' % r['id'] for r in clip[:30]) + (' ...' if len(clip) > 30 else ''))
    L += ['', '### Fonts', '', '- %d fonts kept as-is with `LICENSE.txt` in their folder' % sum(1 for r in recs if r['kind'] == 'font'), '']
    # failures
    real_fail = [f for f in failures if f.get('error') != 'not processed yet']
    L += ['## Failures', '']
    if not real_fail:
        L.append('None.')
    for f in real_fail:
        L.append('- `%s` (%s): %s' % (f['id'], f.get('sourcePath'), (f.get('error') or '')[:200]))
    unproc = [f for f in failures if f.get('error') == 'not processed yet']
    if unproc:
        L.append('- %d planned assets not processed yet (run `ingest.py process`)' % len(unproc))
    missing_prev = [r['id'] for r in recs if not r.get('preview')]
    if missing_prev:
        L.append('- %d assets without a preview: %s' % (len(missing_prev), ', '.join(missing_prev[:10])))
    L.append('')
    # skipped
    L += ['## Skipped source files', '', '| pack | reason | files | example |', '|---|---|---:|---|']
    by = collections.defaultdict(list)
    for s in skipped:
        by[(s['pack'], s['reason'])].append(s['path'])
    for (pk, reason), paths in sorted(by.items(), key=lambda kv: (kv[0][0], -len(kv[1]))):
        L.append('| %s | %s | %d | `%s` |' % (pk, reason, len(paths), paths[0].replace('|', '/')[:90]))
    L += ['', 'Total skipped: %d files (full list: `work/state/skipped.jsonl`). Duplicates of an identical file keep '
              'the other source paths in the catalog entry (`duplicateSources`).' % len(skipped), '']
    # verification
    if verify:
        L += ['## Verification (seed %s, %s)' % (verify.get('seed'), verify.get('time')), '']
        for k, label in (('glb', 'GLBs loaded with three.js GLTFLoader + MeshoptDecoder (tris/clips/rig compared to catalog)'),
                         ('images', 'sprites: PNG size vs catalog, WebP pixel-identical, preview 256 px, atlas frames in bounds'),
                         ('audio', 'audio: ogg + mp3 decode cleanly, duration within 0.15 s of catalog')):
            xs = verify.get(k, [])
            L.append('- %s: **%d/%d ok**' % (label, sum(1 for x in xs if x['ok']), len(xs)))
            for x in xs:
                if not x['ok']:
                    L.append('  - FAIL `%s`: %s' % (x['id'], x.get('problems') or x.get('load', {}).get('error')))
        L.append('')
    if orphans:
        L += ['Library files not referenced by the catalog: %d (leftovers from renamed ids; `ingest.py catalog --prune`).' % len(orphans), '']
    L += ['## How to re-run / add a pack', '',
          '```bash', 'cd %s' % HERE,
          'nice -n 10 python3 ingest.py all            # unpack, scan, process, catalog, sheets, verify, report',
          'nice -n 10 python3 ingest.py process        # only new/changed assets are rebuilt (fingerprints in work/state/)',
          'nice -n 10 python3 ingest.py catalog --prune  # rewrite catalog + delete library files no longer planned',
          '```', '',
          'New zip: add an entry to `packs.json` (`slug`, `zip`, `licence`, `attribution`, `redistributable`, '
          '`rules`: "generic" or a new rule set in `lib/rules.py`), then `python3 ingest.py all`. Already-processed '
          'assets are skipped (per-asset fingerprint of source hashes + pipeline version). Uses <=16 workers '
          '(`NK_WORKERS`), Blender/Node/ffmpeg children run under `nice -n 10`, temp files stay in `work/tmp/`.', '',
          '## Known heuristics / caveats', '',
          '- `kind`, `style` and `tags` come from folder and file names only; the AI tagging pass (contact sheets) is next.',
          '- Animation grouping: numbered files (`walk_1..n`, `walk (1)`) are grouped when sizes match, numbering is '
          'contiguous from 0/1 and the name has an action word or lives in a character/enemy/effects folder; '
          '8/16/32-frame sets without an action word are tagged `rotation-or-direction-frames`.',
          '- Tilesets without Tiled/Kenney metadata use the most common size of the pack\'s single tile images; '
          '`paramsSource: assumed-common-size` means it was guessed from the sheet dimensions.',
          '- Kenney `Archive/` (deprecated/remade packs) and marketing previews/samples are excluded on purpose.',
          '- 3D previews are rendered with Blender Workbench (3/4 view, orthographic); rigged characters show the bind pose.',
          '']
    with open(os.path.join(HERE, 'REPORT.md'), 'w') as f:
        f.write('\n'.join(L))
