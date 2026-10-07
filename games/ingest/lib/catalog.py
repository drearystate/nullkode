"""Stage 4+5: catalog.jsonl, packs.json, README.md, LICENSE files, contact sheets."""
import collections
import hashlib
import json
import math
import multiprocessing as mp
import os
import time

from common import (LIB, WORK, STATE, SHEETS, UNPACKED, WORKERS, read_json, write_json, state_path, log, url_of)

PROCESS_TAGS = {'grid-sheet', 'atlas', 'rigged', 'animated', 'loop', 'jingle'}
KIND_ORDER = ['model', 'sprite', 'spritesheet', 'animation', 'tileset', 'ui', 'icon', 'background', 'texture',
              'material', 'font', 'sfx', 'music']


def _plan():
    with open(os.path.join(WORK, 'plan.jsonl')) as f:
        return [json.loads(l) for l in f]


def _licence_text(pack, rec):
    head = [
        'Licence for files in this folder',
        '================================',
        'Pack: %s' % pack['title'],
        'Licence: %s (%s)' % (pack['licence'], pack['licenceName']),
        'Attribution: %s' % pack['attribution'],
    ]
    if not pack.get('redistributable', True):
        head += ['', 'IMPORTANT: these assets may be used in games (including commercial games) but must NOT be',
                 'sold or redistributed as unaltered assets. Keep them out of any public copy',
                 'of this library.']
    orig = None
    sp = rec['sourcePath'].split('!/')[0].split('/')
    base = os.path.join(UNPACKED, pack['slug'])
    for depth in range(len(sp) - 1, 0, -1):
        for name in ('License.txt', 'LICENSE.txt', 'license.txt', 'Licence.txt'):
            p = os.path.join(base, *sp[:depth], name)
            if os.path.exists(p):
                orig = p
                break
        if orig:
            break
    if not orig:
        for name in ('License.txt', 'LICENSE.txt'):
            for cand in (os.path.join(base, name), os.path.join(base, 'The Complete KayKit Collection v7', name)):
                if os.path.exists(cand):
                    orig = cand
                    break
    if orig:
        head += ['', 'Original licence text (%s):' % os.path.relpath(orig, base), '',
                 open(orig, errors='replace').read().strip()]
    return '\n'.join(head) + '\n'


def build(packs, prune=False):
    pk = {p['slug']: p for p in packs}
    plan = _plan()
    records, failures = [], []
    for r in plan:
        st = read_json(state_path(r['id']))
        if not st:
            failures.append({'id': r['id'], 'error': 'not processed yet', 'sourcePath': r['sourcePath']})
            continue
        if not st.get('ok'):
            failures.append({'id': r['id'], 'error': st.get('error'), 'sourcePath': r['sourcePath'], 'pack': r['pack']})
            continue
        rec = st['record']
        p = pk[rec['pack']]
        out = {
            'id': rec['id'], 'pack': rec['pack'], 'licence': p['licence'], 'attribution': p['attribution'],
            'redistributable': bool(p.get('redistributable', True)), 'kind': rec['kind'], 'style': rec['style'],
            'category': rec['category'], 'name': rec['name'], 'files': rec['files'], 'url': rec['url'],
            'urls': rec['urls'], 'preview': rec['preview'], 'previewUrl': rec['previewUrl'],
            'metrics': rec['metrics'], 'sourceZip': rec['sourceZip'], 'sourcePath': rec['sourcePath'],
            'sha256': rec['sha256'], 'sourceSha256': rec.get('sourceSha256'),
            # name-derived tags come from the current plan (rules may improve without reprocessing);
            # processing-derived tags (rigged, animated, atlas, ...) come from the asset state
            'tags': list(dict.fromkeys(r.get('tags', []) + [t for t in rec['tags'] if t in PROCESS_TAGS])),
        }
        if rec.get('duplicateSources'):
            out['duplicateSources'] = rec['duplicateSources']
        records.append(out)
    records.sort(key=lambda r: r['id'])
    # cross-link Kenney character skins <-> models
    by_id = {r['id']: r for r in records}
    for r in records:
        for sid in r['metrics'].get('skins', []) if r['kind'] == 'model' else []:
            if sid in by_id:
                by_id[sid]['metrics'].setdefault('skinFor', []).append(r['id'])
    # licence files: per pack root folder and every folder holding a font
    lic_dirs = {}
    for r in records:
        root = '/'.join(r['id'].split('/')[:2])
        lic_dirs.setdefault(root, r)
        if r['kind'] == 'font':
            lic_dirs.setdefault(os.path.dirname(r['id']), r)
    for p in packs:
        lic_dirs.setdefault(p['slug'], next((r for r in records if r['pack'] == p['slug']), None))
    for d, r in lic_dirs.items():
        if r is None:
            continue
        txt = _licence_text(pk[r['pack']], r)
        path = os.path.join(LIB, d, 'LICENSE.txt')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path) or open(path).read() != txt:
            with open(path, 'w') as f:
                f.write(txt)
    tmp = os.path.join(LIB, 'catalog.jsonl.tmp')
    with open(tmp, 'w') as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n')
    os.replace(tmp, os.path.join(LIB, 'catalog.jsonl'))
    write_json(os.path.join(STATE, 'failures.json'), failures, indent=1)
    # packs.json
    packs_out = []
    for p in packs:
        recs = [r for r in records if r['pack'] == p['slug']]
        kinds = collections.Counter(r['kind'] for r in recs)
        size = 0
        nfiles = 0
        for root, _, files in os.walk(os.path.join(LIB, p['slug'])):
            for f in files:
                size += os.path.getsize(os.path.join(root, f))
                nfiles += 1
        psize = 0
        for root, _, files in os.walk(os.path.join(LIB, '_previews', p['slug'])):
            for f in files:
                psize += os.path.getsize(os.path.join(root, f))
        packs_out.append({
            'pack': p['slug'], 'title': p['title'], 'licence': p['licence'], 'licenceName': p['licenceName'],
            'attribution': p['attribution'], 'redistributable': bool(p.get('redistributable', True)),
            'sourceZip': os.path.basename(p['zip']), 'assets': len(recs),
            'countsByKind': {k: kinds[k] for k in KIND_ORDER if kinds.get(k)},
            'bytesOnDisk': size, 'files': nfiles, 'previewBytes': psize,
            'categories': len({'/'.join(r['id'].split('/')[:2]) for r in recs}),
            'licenceFile': url_of(p['slug'] + '/LICENSE.txt'),
        })
    write_json(os.path.join(LIB, 'packs.json'), {'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                                                 'assets': len(records), 'packs': packs_out}, indent=2)
    _readme(packs_out, len(records))
    log('catalog: %d records, %d failures/unprocessed' % (len(records), len(failures)))
    # orphans
    expected = {'catalog.jsonl', 'packs.json', 'README.md'}
    for r in records:
        expected.add(r['files']['primary'])
        expected.update((r['files'].get('alternates') or {}).values())
        expected.update(r['files'].get('frames', []))
        if r.get('preview'):
            expected.add(r['preview'])
        if r['metrics'].get('infoFile'):
            expected.add(r['metrics']['infoFile'])
    for d in lic_dirs:
        expected.add(d + '/LICENSE.txt')
    orphans = []
    for root, _, files in os.walk(LIB):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), LIB)
            if rel not in expected:
                orphans.append(rel)
    write_json(os.path.join(STATE, 'orphans.json'), orphans[:5000], indent=1)
    if orphans:
        log('library files not referenced by the catalog: %d%s' % (len(orphans), ' (deleting)' if prune else
                                                                     ' (run catalog --prune to delete)'))
        if prune:
            for rel in orphans:
                os.remove(os.path.join(LIB, rel))
            for root, dirs, files in os.walk(LIB, topdown=False):
                if root != LIB and not os.listdir(root):
                    os.rmdir(root)
            write_json(os.path.join(STATE, 'orphans.json'), [], indent=1)
    return records


def _readme(packs_out, total):
    lines = [
        '# NullKode game-asset library', '',
        'Curated, normalised game assets used by games built on NullKode. Generated by',
        '`nk-games/ingest/ingest.py` from the source packs; do not edit files here by hand (re-run the pipeline).', '',
        '## Layout', '',
        '```',
        'game-assets/',
        '  catalog.jsonl            one JSON object per asset (server-side index for the builder/AI)',
        '  packs.json               per-pack licence, attribution, counts by kind, size on disk',
        '  <pack>/<category>/<name>.<ext>    the asset (id = <pack>/<category>/<name>)',
        '  <pack>/<category>/LICENSE.txt     licence + attribution for that folder',
        '  _previews/<id>.webp      256 px preview of every asset',
        '```', '',
        'Every asset id is a stable slug, e.g. `kenney/nature-kit/tree-pine-small-a`. URLs are',
        '`/game-assets/<file>`; the catalog lists the primary file, alternates and the preview.', '',
        '### Formats', '',
        '- **3D models**: one `.glb` per model (glTF 2.0, metres, Y-up). Compressed with `EXT_meshopt_compression`',
        '  (positions/normals are never quantized, so node pivots are unchanged) and WebP textures',
        '  (`EXT_texture_webp`). In three.js: `loader.setMeshoptDecoder(MeshoptDecoder)` from',
        '  `three/examples/jsm/libs/meshopt_decoder.module.js`. Animations and rigs are kept; metrics list',
        '  triangles, bbox/size (m), clips, materials, textures, rigged. Kenney animated characters are merged into one',
        '  GLB with all clips; their skins are separate `texture` assets (`metrics.skinFor`).',
        '- **2D**: original PNG/SVG plus a lossless `.webp` when smaller. `@2x` alternates where the pack had them.',
        '  Sprite sheets: Starling XML (`.xml`) and Phaser JSON-hash (`.json`) atlases. Tilesets: tile size,',
        '  spacing, margin, columns/rows in `metrics` (`.packed.png` = no spacing). Numbered frame files are grouped',
        '  into one `animation` asset: a generated strip/grid `.png` + the original frames in `<id>/NN.png`.',
        '- **Audio**: `.ogg` (primary) + `.mp3`; `.norm.ogg` only when the source clips. `kind` is `sfx` or `music`.',
        '- **Fonts**: original TTF/OTF with `LICENSE.txt` beside them.', '',
        '## Licences', '',
    ]
    for p in packs_out:
        lines.append('- **%s** (`%s`, %d assets): %s. Attribution: %s.' % (
            p['title'], p['pack'], p['assets'], p['licenceName'], p['attribution']))
    lines += [
        '', '> Packs marked `"redistributable": false` in packs.json may be used in games but not shared as files.', '',
        'Kenney and KayKit assets are CC0 (public domain); credit is appreciated but not required.', '',
        'Total assets: %d.' % total, '',
    ]
    with open(os.path.join(LIB, 'README.md'), 'w') as f:
        f.write('\n'.join(lines))


# ------------------------------------------------------------------ contact sheets

COLS, ROWS, CELL = 6, 5, 216


def _sheet_one(args):
    from PIL import Image, ImageDraw, ImageFont
    out, items = args
    W, H = COLS * CELL, ROWS * CELL
    sheet = Image.new('RGB', (W, H), (232, 234, 238))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
    except Exception:
        font = ImageFont.load_default()
    for n, (num, prev) in enumerate(items):
        cx, cy = (n % COLS) * CELL, (n // COLS) * CELL
        # checker background so transparent/white assets stay visible
        for yy in range(0, CELL, 12):
            for xx in range(0, CELL, 12):
                if (xx // 12 + yy // 12) % 2 == 0:
                    d.rectangle((cx + xx, cy + yy, cx + xx + 11, cy + yy + 11), fill=(222, 224, 229))
        if prev and os.path.exists(prev):
            with Image.open(prev) as im:
                im = im.convert('RGBA').resize((CELL - 16, CELL - 16), Image.LANCZOS)
                sheet.paste(im, (cx + 8, cy + 8), im)
        d.rectangle((cx, cy, cx + CELL - 1, cy + CELL - 1), outline=(180, 184, 192))
        label = str(num)
        tw = d.textlength(label, font=font)
        d.rectangle((cx + 2, cy + 2, cx + 10 + tw, cy + 26), fill=(20, 24, 33))
        d.text((cx + 6, cy + 4), label, fill=(255, 255, 255), font=font)
    tmp = out + '.tmp.webp'
    sheet.save(tmp, 'WEBP', quality=80, method=4)
    os.replace(tmp, out)
    return out


def _pstat(r):
    try:
        st = os.stat(os.path.join(LIB, r['preview']))
        return [st.st_size, int(st.st_mtime)]
    except (OSError, TypeError):
        return None


def sheets():
    cat = os.path.join(LIB, 'catalog.jsonl')
    with open(cat) as f:
        recs = [json.loads(l) for l in f]
    recs.sort(key=lambda r: (r['pack'], KIND_ORDER.index(r['kind']) if r['kind'] in KIND_ORDER else 99,
                             r['category'], r['id']))
    os.makedirs(SHEETS, exist_ok=True)
    old = read_json(os.path.join(SHEETS, 'sheets.json'), {}) or {}
    old_sig = {s['file']: s['sig'] for s in old.get('sheets', [])}
    out_sheets, jobs = [], []
    per = COLS * ROWS
    for i in range(0, len(recs), per):
        chunk = recs[i:i + per]
        n = i // per + 1
        fname = 's%05d.webp' % n
        sig = hashlib.sha1(json.dumps([[r['id'], r['sha256'], _pstat(r)] for r in chunk]).encode()).hexdigest()
        entry = {'file': fname, 'sig': sig, 'pack': chunk[0]['pack'],
                 'kinds': sorted({r['kind'] for r in chunk}),
                 'items': [{'n': k + 1, 'id': r['id'], 'kind': r['kind']} for k, r in enumerate(chunk)]}
        out_sheets.append(entry)
        path = os.path.join(SHEETS, fname)
        if old_sig.get(fname) == sig and os.path.exists(path):
            continue
        jobs.append((path, [(k + 1, os.path.join(LIB, r['preview']) if r.get('preview') else None)
                            for k, r in enumerate(chunk)]))
    log('sheets: %d total, %d to (re)build' % (len(out_sheets), len(jobs)))
    with mp.Pool(WORKERS) as pool:
        for _ in pool.imap_unordered(_sheet_one, jobs, chunksize=4):
            pass
    # remove stale sheet files beyond the current count
    keep = {s['file'] for s in out_sheets}
    for f in os.listdir(SHEETS):
        if f.endswith('.webp') and f not in keep:
            os.remove(os.path.join(SHEETS, f))
    write_json(os.path.join(SHEETS, 'sheets.json'), {'grid': [COLS, ROWS], 'cell': CELL, 'sheets': out_sheets})
    with open(os.path.join(SHEETS, 'index.jsonl'), 'w') as f:
        for s in out_sheets:
            for it in s['items']:
                f.write(json.dumps({'sheet': s['file'], 'n': it['n'], 'id': it['id']}) + '\n')
