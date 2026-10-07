"""Stage 3: build library files + metrics + previews for every planned asset (skips finished work)."""
import collections
import concurrent.futures as cf
import hashlib
import io
import json
import math
import multiprocessing as mp
import os
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET

from common import (UNPACKED, LIB, WORK, STATE, STAGE3D, TMP, PREVIEWS, BLENDER, NODE, HERE, WORKERS,
                    PIPELINE_VERSION, read_json, write_json, sha256_file, atomic_copy, state_path, id_hash,
                    url_of, log, load_packs)

PROC_VERSION = {'image': 5, 'svg': 3, 'atlas': 3, 'tileset': 3, 'anim': 4, 'audio': 2, 'font': 1,
                'model': 1, 'charpack': 3}
PREVIEW = 256
PUBLISHER_VERSION = 3  # bump to reprocess only the quaternius / pixel-frog packs
# packs whose rules set is a publisher one (quaternius, pixel-frog): conversion extras, frame size from file names
PUBLISHER_PACKS = {p['slug'] for p in (load_packs() or []) if p.get('rules') in ('quaternius', 'pixel-frog')}

# --------------------------------------------------------------------------- helpers


def src_abs(rec, rel):
    return os.path.join(UNPACKED, rec['pack'], rel)


def fingerprint(rec):
    h = hashlib.sha1()
    parts = [PIPELINE_VERSION, PROC_VERSION.get(rec['proc']), rec['id'], rec['kind'], rec['src'],
             rec.get('srcSha'), rec.get('frameShas'), rec.get('tileHints'), rec.get('siblingTileSize')]
    if rec['pack'] in PUBLISHER_PACKS:  # appended only for these packs so older fingerprints stay the same
        parts.append([PUBLISHER_VERSION, rec.get('frameSize'), rec.get('fps')])
    h.update(json.dumps(parts, sort_keys=True).encode())
    return h.hexdigest()


def preview_rel(asset_id):
    return '_previews/' + asset_id + '.webp'


def is_pixel(rec, w, h):
    return any(s.startswith('pixel') for s in rec.get('style', [])) or max(w, h) <= 48


def _mostly_light(img):
    import numpy as np
    a = np.asarray(img, dtype=np.float32)
    alpha = a[:, :, 3] / 255.0
    cover = alpha.mean()
    if cover < 0.01 or alpha.min() > 0.99:
        return False
    whiteness = a[:, :, :3].min(axis=2)  # high only for white/very light grey, not for saturated yellow etc.
    return float((whiteness * alpha).sum() / max(alpha.sum(), 1e-6)) > 200


def save_preview(img, asset_id, pixel, crop=False):
    from PIL import Image
    img = img.convert('RGBA')
    if crop:
        # single sprites on a big transparent canvas: preview the content, not the empty margin
        bb = img.getchannel('A').getbbox()
        if bb and ((bb[2] - bb[0]) < 0.6 * img.width or (bb[3] - bb[1]) < 0.6 * img.height):
            pad = max(2, int(0.06 * max(bb[2] - bb[0], bb[3] - bb[1])))
            bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(img.width, bb[2] + pad), min(img.height, bb[3] + pad))
            img = img.crop(bb)
    w, h = img.size
    scale = min(PREVIEW / w, PREVIEW / h)
    if pixel and scale >= 1:
        s = max(1, int(math.floor(scale)))
        img = img.resize((w * s, h * s), Image.NEAREST)
    elif scale < 1:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))),
                         Image.BOX if pixel else Image.LANCZOS)
    elif scale > 1:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (PREVIEW, PREVIEW), (0, 0, 0, 0))
    if _mostly_light(img):
        # white/very light art on transparency: give it a dark backdrop so it stays visible
        from PIL import ImageDraw
        ImageDraw.Draw(canvas).rounded_rectangle((0, 0, PREVIEW - 1, PREVIEW - 1), radius=16, fill=(48, 52, 62, 255))
    canvas.paste(img, ((PREVIEW - img.width) // 2, (PREVIEW - img.height) // 2), img)
    out = os.path.join(LIB, preview_rel(asset_id))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + '.tmp.webp'
    canvas.save(tmp, 'WEBP', quality=82, method=4)
    os.replace(tmp, out)
    return preview_rel(asset_id)


def webp_copy(img_path, out_webp, lossless=True):
    """Write a webp of img_path if it is smaller than the original. Returns True if kept."""
    from PIL import Image
    tmp = out_webp + '.tmp.webp'
    with Image.open(img_path) as im:
        im.load()
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if ('transparency' in im.info or im.mode in ('LA', 'PA', 'P')) else 'RGB')
        if lossless:
            im.save(tmp, 'WEBP', lossless=True, method=4, exact=True)
        else:
            im.save(tmp, 'WEBP', quality=90, method=4)
    if os.path.getsize(tmp) < os.path.getsize(img_path):
        os.replace(tmp, out_webp)
        return True
    os.remove(tmp)
    if os.path.exists(out_webp):
        os.remove(out_webp)
    return False


def put(src, rel):
    atomic_copy(src, os.path.join(LIB, rel))
    return rel


def finish(rec, kind, files, metrics, preview, extra_tags=(), style=None):
    primary = files['primary']
    rec_out = {
        'id': rec['id'], 'pack': rec['pack'], 'kind': kind, 'style': style or rec.get('style', []),
        'category': rec['category'], 'name': rec['name'], 'files': files,
        'url': url_of(primary),
        'urls': {k: url_of(v) for k, v in (files.get('alternates') or {}).items()},
        'preview': preview, 'previewUrl': url_of(preview) if preview else None,
        'metrics': metrics, 'sourceZip': rec['sourceZip'], 'sourcePath': rec['sourcePath'],
        'sha256': sha256_file(os.path.join(LIB, primary)), 'sourceSha256': rec.get('srcSha'),
        'tags': list(dict.fromkeys(rec.get('tags', []) + list(extra_tags))),
    }
    if rec.get('duplicates'):
        rec_out['duplicateSources'] = rec['duplicates'][:20]
    return rec_out


def outputs_of(record):
    out = [record['files']['primary']] + list((record['files'].get('alternates') or {}).values())
    out += record['files'].get('frames', [])
    if record.get('preview'):
        out.append(record['preview'])
    return out


# --------------------------------------------------------------------------- grid detection

def detect_grid(img, hint=None):
    """Return {frameWidth, frameHeight, columns, rows, frames, source} for regular sheets, else None."""
    import numpy as np
    w, h = img.size
    if hint:
        fw, fh = hint
        if fw and fh and w % fw == 0 and h % fh == 0 and (w // fw) * (h // fh) >= 2:
            return {'frameWidth': fw, 'frameHeight': fh, 'columns': w // fw, 'rows': h // fh,
                    'frames': (w // fw) * (h // fh), 'source': 'sibling-frames'}
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    a = np.asarray(img)[:, :, 3]
    if a.max() == 0:
        return None

    def period(nonempty):
        segs, start = [], None
        for i, v in enumerate(list(nonempty) + [False]):
            if v and start is None:
                start = i
            elif not v and start is not None:
                segs.append((start, i))
                start = None
        if len(segs) < 2:
            return None
        starts = [s for s, _ in segs]
        diffs = {starts[i + 1] - starts[i] for i in range(len(starts) - 1)}
        if len(diffs) == 1:
            p = diffs.pop()
            if p * len(segs) >= len(nonempty) - p // 2 and p >= 4:
                return p, len(segs)
        return None

    cols = period(a.max(axis=0) > 0)
    rows = period(a.max(axis=1) > 0)
    if cols or rows:
        fw, nc = cols if cols else (w, 1)
        fh, nr = rows if rows else (h, 1)
        if nc * nr >= 2:
            return {'frameWidth': fw, 'frameHeight': fh, 'columns': nc, 'rows': nr, 'frames': nc * nr,
                    'source': 'transparent-gutters'}
    if w >= 2 * h and w % h == 0 and h >= 8:
        return {'frameWidth': h, 'frameHeight': h, 'columns': w // h, 'rows': 1, 'frames': w // h,
                'source': 'square-strip'}
    return None


SHEET_NAME = re.compile(r'(sprite)?sheet|strip|frames|_anim', re.I)

# --------------------------------------------------------------------------- 2D processors


def proc_image(rec, ctx):
    from PIL import Image
    src = src_abs(rec, rec['src']['primary'])
    ext = os.path.splitext(src)[1].lower().replace('.jpeg', '.jpg')
    base = rec['id']
    files = {'primary': put(src, base + ext), 'alternates': {}}
    with Image.open(src) as im:
        im.load()
        w, h = im.size
        mode = im.mode
        rgba = im.convert('RGBA')
    if webp_copy(src, os.path.join(LIB, base + '.webp'), lossless=(ext != '.jpg')):
        files['alternates']['webp'] = base + '.webp'
    for k, rel in sorted(rec['src'].get('alts', {}).items()):
        aext = os.path.splitext(rel)[1].lower().replace('.jpeg', '.jpg')
        if k.startswith('svg'):
            files['alternates'][k] = put(src_abs(rec, rel), base + ('' if k == 'svg' else '@' + k[4:]) + '.svg')
        else:
            files['alternates'][k] = put(src_abs(rec, rel), '%s@%s%s' % (base, k.replace('.', ''), aext))
    pixel = is_pixel(rec, w, h)
    metrics = {'width': w, 'height': h, 'hasAlpha': 'A' in rgba.getbands() and rgba.getextrema()[3][0] < 255}
    try:
        colors = rgba.getcolors(maxcolors=256)
        metrics['colors'] = len(colors) if colors else '>256'
    except Exception:
        pass
    kind = rec['kind']
    stem = os.path.splitext(os.path.basename(rec['src']['primary']))[0]
    extra = []
    fs = rec.get('frameSize')
    if fs and w % fs[0] == 0 and h % fs[1] == 0:
        cols, rows = w // fs[0], h // fs[1]
        g = {'frameWidth': fs[0], 'frameHeight': fs[1], 'columns': cols, 'rows': rows, 'frames': cols * rows,
             'source': 'file-name'}
        if cols * rows >= 2:
            metrics['grid'] = g
            metrics['frameWidth'], metrics['frameHeight'], metrics['frames'] = fs[0], fs[1], cols * rows
            if rec.get('fps'):
                metrics['suggestedFps'] = rec['fps']
            kind = 'spritesheet'
            extra.append('grid-sheet')
        else:
            kind = 'sprite' if kind == 'spritesheet' else kind
    elif fs:
        metrics['frameSizeFromName'] = fs  # name says WxH but the image doesn't divide evenly: look for gutters
        g = detect_grid(rgba)
        if g and (g['frameWidth'] * g['columns'] > w or g['frameHeight'] * g['rows'] > h):
            g = None  # gutter period overruns the image: not a real grid
        if not (g and g['source'] == 'transparent-gutters'):
            # frames of equal width whose content is not evenly placed (speech bubbles growing in): n blobs, w % n == 0
            import numpy as np
            occ = list(np.asarray(rgba)[:, :, 3].max(axis=0) > 0)
            n = sum(1 for i, v in enumerate(occ) if v and (i == 0 or not occ[i - 1]))
            g = ({'frameWidth': w // n, 'frameHeight': h, 'columns': n, 'rows': 1, 'frames': n, 'source': 'equal-blobs'}
                 if n >= 2 and w % n == 0 else None)
        if g and g['frames'] >= 2 and g['source'] in ('transparent-gutters', 'equal-blobs'):
            metrics['grid'] = g
            metrics['frameWidth'], metrics['frameHeight'], metrics['frames'] = g['frameWidth'], g['frameHeight'], g['frames']
            if rec.get('fps'):
                metrics['suggestedFps'] = rec['fps']
            kind = 'spritesheet'
            extra.append('grid-sheet')
        elif kind == 'spritesheet':
            kind = 'sprite'
    elif rec['pack'] in PUBLISHER_PACKS and kind in ('sprite', 'ui') and w >= 2 * h and w % h == 0 and h <= 64 \
            and not rec['src'].get('alts'):
        # Pixel Frog strips without a size in the name (fruits, 'Collected'): square frames
        g = detect_grid(rgba)
        if g and g['source'] in ('square-strip', 'transparent-gutters') and g['frameWidth'] == h:
            metrics['grid'] = g
            metrics['frameWidth'], metrics['frameHeight'], metrics['frames'] = h, h, g['frames']
            if rec.get('fps'):
                metrics['suggestedFps'] = rec['fps']
            kind = 'spritesheet'
            extra.append('grid-sheet')
    if 'grid' in metrics:
        pass
    elif kind in ('sprite', 'background', 'texture') and (SHEET_NAME.search(stem) or
                                                          (max(w, h) >= 3 * min(w, h) and min(w, h) <= 128)):
        g = detect_grid(rgba, ctx.get('frameHint', {}).get(rec['id']))
        if g and (SHEET_NAME.search(stem) or g['source'] != 'square-strip' or min(w, h) <= 64):
            metrics['grid'] = g
            kind = 'spritesheet'
            extra.append('grid-sheet')
    g = metrics.get('grid')
    if rec['pack'] in PUBLISHER_PACKS and g and g['rows'] == 1 and g['frames'] >= 2:
        # animation strip: preview its first frame (a 12-frame strip shrunk to 256 px shows nothing)
        prev = save_preview(rgba.crop((0, 0, g['frameWidth'], g['frameHeight'])), rec['id'], pixel, crop=True)
    else:
        prev = save_preview(rgba, rec['id'], pixel, crop=kind in ('sprite', 'ui', 'icon'))
    style = list(rec.get('style', []))
    if pixel and not any(s.startswith('pixel') for s in style) and isinstance(metrics.get('colors'), int) \
            and metrics['colors'] <= 32 and max(w, h) <= 64:
        style = ['pixel-8bit'] + [s for s in style if s != 'hd']
    return finish(rec, kind, files, metrics, prev, extra, style)


def proc_svg(rec, ctx):
    from PIL import Image
    src = src_abs(rec, rec['src']['primary'])
    base = rec['id']
    files = {'primary': put(src, base + '.svg'), 'alternates': {}}
    r = ctx['svg'].get(rec['id']) or {}
    if not r.get('ok'):
        raise RuntimeError('svg raster failed: %s' % r.get('error'))
    metrics = {'width': r.get('width'), 'height': r.get('height'), 'vector': True}
    with Image.open(r['png']) as im:
        prev = save_preview(im.convert('RGBA'), rec['id'], False)
    return finish(rec, rec['kind'], files, metrics, prev)


def _atlas_frames(xml_path):
    root = ET.parse(xml_path).getroot()
    frames = []
    for st in root.findall('SubTexture'):
        x, y, w, h = (int(float(st.get(k, 0))) for k in ('x', 'y', 'width', 'height'))
        f = {'name': st.get('name'), 'x': x, 'y': y, 'w': w, 'h': h}
        if st.get('frameWidth'):
            f['trim'] = {'x': -int(float(st.get('frameX', 0))), 'y': -int(float(st.get('frameY', 0))),
                         'w': int(float(st.get('frameWidth'))), 'h': int(float(st.get('frameHeight')))}
        if st.get('rotated') in ('true', '1'):
            f['rotated'] = True
        frames.append(f)
    return root, frames


def _write_atlas(xml_src, png_rel, xml_rel, json_rel, size):
    root, frames = _atlas_frames(xml_src)
    root.set('imagePath', os.path.basename(png_rel))
    out = os.path.join(LIB, xml_rel)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    ET.ElementTree(root).write(out + '.tmp', encoding='utf-8', xml_declaration=True)
    os.replace(out + '.tmp', out)
    fr = {}
    for f in frames:
        name = re.sub(r'\.png$', '', f['name'] or 'frame')
        t = f.get('trim')
        fr[name] = {
            'frame': {'x': f['x'], 'y': f['y'], 'w': f['w'], 'h': f['h']},
            'rotated': bool(f.get('rotated')), 'trimmed': bool(t),
            'spriteSourceSize': {'x': t['x'] if t else 0, 'y': t['y'] if t else 0, 'w': f['w'], 'h': f['h']},
            'sourceSize': {'w': t['w'] if t else f['w'], 'h': t['h'] if t else f['h']},
        }
    js = {'frames': fr, 'meta': {'image': os.path.basename(png_rel), 'format': 'RGBA8888',
                                 'size': {'w': size[0], 'h': size[1]}, 'scale': '1',
                                 'app': 'nullkode game-assets ingest (converted from TextureAtlas XML)'}}
    write_json(os.path.join(LIB, json_rel), js)
    return frames


def proc_atlas(rec, ctx):
    from PIL import Image
    src = src_abs(rec, rec['src']['primary'])
    base = rec['id']
    files = {'primary': put(src, base + '.png'), 'alternates': {}}
    with Image.open(src) as im:
        im.load()
        w, h = im.size
        rgba = im.convert('RGBA')
    frames = _write_atlas(src_abs(rec, rec['src']['atlas']), files['primary'], base + '.xml', base + '.json', (w, h))
    files['alternates']['xml'] = base + '.xml'
    files['alternates']['json'] = base + '.json'
    if webp_copy(src, os.path.join(LIB, base + '.webp')):
        files['alternates']['webp'] = base + '.webp'
    for k, rel in sorted(rec['src'].get('alts', {}).items()):
        if k.startswith('svg'):
            files['alternates'][k] = put(src_abs(rec, rel), base + '.svg')
            continue
        arel = put(src_abs(rec, rel), '%s@%s.png' % (base, k))
        files['alternates'][k] = arel
        axml = rec['src'].get('altAtlas', {}).get(k)
        if axml:
            with Image.open(src_abs(rec, rel)) as im2:
                s2 = im2.size
            _write_atlas(src_abs(rec, axml), arel, '%s@%s.xml' % (base, k), '%s@%s.json' % (base, k), s2)
            files['alternates'][k + '-xml'] = '%s@%s.xml' % (base, k)
            files['alternates'][k + '-json'] = '%s@%s.json' % (base, k)
    sizes = collections.Counter((f['w'], f['h']) for f in frames)
    metrics = {'width': w, 'height': h, 'frames': len(frames),
               'frameNames': [re.sub(r'\.png$', '', f['name'] or '') for f in frames][:300],
               'atlasFormat': ['phaser-json-hash', 'starling-xml']}
    if len(sizes) == 1:
        fw, fh = next(iter(sizes))
        metrics['frameWidth'], metrics['frameHeight'] = fw, fh
    pixel = is_pixel(rec, w, h)
    prev = save_preview(rgba, rec['id'], pixel)
    return finish(rec, 'spritesheet', files, metrics, prev, ['atlas'])


def _tile_params(w, h, rec, fname, packed):
    hints = rec.get('tileHints') or []
    lf = fname.lower()

    def fits(tw, th, sp, mg):
        if tw <= 0 or th <= 0 or tw > w or th > h:
            return False
        return (w - 2 * mg + sp) % (tw + sp) == 0 and (h - 2 * mg + sp) % (th + sp) == 0

    order = []
    for hnt in hints:
        score = 5
        if hnt['src'] == 'tsx' and hnt.get('image') and hnt['image'].lower() == lf:
            score = 0
        elif hnt['src'] == 'txt' and hnt.get('key') and any(k in lf for k in re.split(r'\W+', hnt['key']) if len(k) > 3):
            score = 1
        elif hnt['src'] == 'txt' and not hnt.get('key'):
            score = 2
        elif hnt['src'] == 'txt' and hnt.get('key') in ('tiles', 'tilesheet'):
            score = 3
        order.append((score, hnt))
    order.sort(key=lambda t: t[0])
    cands = [(hn['tw'], hn['th'], 0 if packed else hn.get('spacing', 0), 0 if packed else hn.get('margin', 0),
              hn['src'] + ':' + os.path.basename(hn['file'])) for _, hn in order]
    if rec.get('siblingTileSize'):
        tw, th = rec['siblingTileSize']
        for sp in ((0,) if packed else (0, 1, 2)):
            cands.append((tw, th, sp, 0, 'sibling-tile-images'))
    for t in (16, 18, 32, 8, 12, 24, 48, 64, 128):
        cands.append((t, t, 0, 0, 'assumed-common-size'))
    for tw, th, sp, mg, srcname in cands:
        for sp2 in ([sp] if packed or srcname != 'assumed-common-size' else [0, 1]):
            if fits(tw, th, sp2, mg):
                cols = (w - 2 * mg + sp2) // (tw + sp2)
                rows = (h - 2 * mg + sp2) // (th + sp2)
                if cols * rows < 2:
                    continue
                return {'tileWidth': tw, 'tileHeight': th, 'spacing': sp2, 'margin': mg, 'columns': cols,
                        'rows': rows, 'tileCount': cols * rows, 'paramsSource': srcname}
    return None


def proc_tileset(rec, ctx):
    from PIL import Image
    src = src_abs(rec, rec['src']['primary'])
    base = rec['id']
    ext = os.path.splitext(src)[1].lower()
    files = {'primary': put(src, base + ext), 'alternates': {}}
    with Image.open(src) as im:
        im.load()
        w, h = im.size
        rgba = im.convert('RGBA')
    if webp_copy(src, os.path.join(LIB, base + '.webp'), lossless=(ext != '.jpg')):
        files['alternates']['webp'] = base + '.webp'
    metrics = {'width': w, 'height': h}
    tp = _tile_params(w, h, rec, os.path.basename(src), packed=False)
    if tp:
        metrics.update(tp)
    else:
        metrics['tileParams'] = 'unknown'
    for k, rel in sorted(rec['src'].get('alts', {}).items()):
        aext = os.path.splitext(rel)[1].lower()
        files['alternates'][k] = put(src_abs(rec, rel), '%s.%s%s' % (base, k, aext) if k == 'packed'
                                     else '%s@%s%s' % (base, k, aext))
        if k == 'packed':
            with Image.open(src_abs(rec, rel)) as im2:
                pw, ph = im2.size
            pp = _tile_params(pw, ph, rec, os.path.basename(rel), packed=True)
            if tp and pw % tp['tileWidth'] == 0 and ph % tp['tileHeight'] == 0:
                pp = {'tileWidth': tp['tileWidth'], 'tileHeight': tp['tileHeight'], 'spacing': 0, 'margin': 0,
                      'columns': pw // tp['tileWidth'], 'rows': ph // tp['tileHeight'],
                      'tileCount': (pw // tp['tileWidth']) * (ph // tp['tileHeight']), 'paramsSource': 'from-unpacked'}
            metrics['packed'] = dict(pp or {}, width=pw, height=ph)
    prev = save_preview(rgba, rec['id'], is_pixel(rec, w, h) or (tp and tp['tileWidth'] <= 32))
    return finish(rec, 'tileset', files, metrics, prev)


def proc_anim(rec, ctx):
    from PIL import Image
    base = rec['id']
    frames = rec['src']['frames']
    imgs = []
    files = {'primary': None, 'alternates': {}, 'frames': []}
    for n, rel in enumerate(frames):
        src = src_abs(rec, rel)
        files['frames'].append(put(src, '%s/%02d.png' % (base, n)))
        im = Image.open(src)
        im.load()
        imgs.append(im.convert('RGBA'))
    fw, fh = imgs[0].size
    n = len(imgs)
    cols = n if n * fw <= 4096 else max(1, 4096 // fw)
    rows = int(math.ceil(n / cols))
    sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        sheet.paste(im, ((i % cols) * fw, (i // cols) * fh))
    out = os.path.join(LIB, base + '.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out + '.tmp.png', 'PNG', optimize=True)
    os.replace(out + '.tmp.png', out)
    files['primary'] = base + '.png'
    if webp_copy(out, os.path.join(LIB, base + '.webp')):
        files['alternates']['webp'] = base + '.webp'
    names = [os.path.splitext(os.path.basename(r))[0] for r in frames]
    metrics = {'frameWidth': fw, 'frameHeight': fh, 'frames': n, 'columns': cols, 'rows': rows,
               'width': cols * fw, 'height': rows * fh, 'frameNames': names,
               'suggestedFps': 8 if n <= 4 else 10, 'layout': 'generated strip/grid from separate frame files'}
    prev = save_preview(imgs[0], rec['id'], is_pixel(rec, fw, fh), crop=True)
    return finish(rec, 'animation', files, metrics, prev)


# --------------------------------------------------------------------------- audio / font

def _ff(args, **kw):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', '-v', 'error'] + args,
                          capture_output=True, text=True, **kw)


def proc_audio(rec, ctx):
    from PIL import Image, ImageDraw
    src = src_abs(rec, rec['src']['primary'])
    base = rec['id']
    ext = os.path.splitext(src)[1].lower()
    pr = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                         'format=duration:stream=channels,sample_rate,codec_name', '-of', 'json', src],
                        capture_output=True, text=True)
    pj = json.loads(pr.stdout or '{}')
    st = (pj.get('streams') or [{}])[0]
    dur = float((pj.get('format') or {}).get('duration') or 0)
    os.makedirs(os.path.dirname(os.path.join(LIB, base)), exist_ok=True)
    files = {'primary': base + '.ogg', 'alternates': {}}
    ogg = os.path.join(LIB, base + '.ogg')
    if ext == '.ogg':
        put(src, base + '.ogg')
    else:
        r = _ff(['-i', src, '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '5', ogg + '.tmp.ogg'])
        if r.returncode:
            raise RuntimeError('ogg encode: ' + r.stderr[-300:])
        os.replace(ogg + '.tmp.ogg', ogg)
    mp3 = os.path.join(LIB, base + '.mp3')
    if ext == '.mp3':
        put(src, base + '.mp3')
    else:
        r = _ff(['-i', src, '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '3', mp3 + '.tmp.mp3'])
        if r.returncode:
            raise RuntimeError('mp3 encode: ' + r.stderr[-300:])
        os.replace(mp3 + '.tmp.mp3', mp3)
    files['alternates']['mp3'] = base + '.mp3'
    vd = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', src, '-af', 'volumedetect', '-f', 'null', '-'],
                        capture_output=True, text=True).stderr

    def grab(pat, cast=float):
        m = re.search(pat, vd)
        return cast(m.group(1)) if m else None
    maxv = grab(r'max_volume:\s*(-?[\d.]+) dB')
    meanv = grab(r'mean_volume:\s*(-?[\d.]+) dB')
    h0 = grab(r'histogram_0db:\s*(\d+)', int) or 0
    nsamp = grab(r'n_samples:\s*(\d+)', int) or 0
    ast = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', src, '-af',
                          'astats=measure_overall=Peak_level+Flat_factor+Peak_count:measure_perchannel=none',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr

    def agrab(pat):
        m = re.search(pat, ast)
        try:
            return float(m.group(1)) if m else None
        except ValueError:
            return None
    peak = agrab(r'Peak level dB:\s*(-?[\d.]+|-?inf)')
    flat = agrab(r'Flat factor:\s*(-?[\d.]+)') or 0.0
    pcount = agrab(r'Peak count:\s*([\d.]+)') or 0.0
    # obvious clipping = sitting at full scale with flat-topped runs, not merely peak-normalised
    clipping = peak is not None and peak >= -0.01 and (pcount >= 100 or flat >= 5)
    metrics = {'duration': round(dur, 3), 'channels': st.get('channels'), 'sampleRate': int(st.get('sample_rate') or 0),
               'sourceCodec': st.get('codec_name'), 'maxVolumeDb': maxv, 'meanVolumeDb': meanv,
               'peakDb': peak, 'flatFactor': round(flat, 2), 'peakCount': pcount, 'clipping': bool(clipping)}
    if clipping:
        r = _ff(['-i', src, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', str(metrics['sampleRate'] or 44100),
                 '-c:a', 'libvorbis', '-q:a', '5', ogg + '.norm.tmp.ogg'])
        if r.returncode == 0:
            os.replace(ogg + '.norm.tmp.ogg', os.path.join(LIB, base + '.norm.ogg'))
            files['alternates']['normalized-ogg'] = base + '.norm.ogg'
    kind = 'music' if (rec.get('musicHint') or dur >= 20) else 'sfx'
    tags = ['loop'] if re.search(r'loop', rec['sourcePath'], re.I) else []
    if 'jingle' in rec['sourcePath'].lower():
        tags.append('jingle')
    # waveform preview
    wpng = os.path.join(TMP, 'wave', id_hash(base) + '.png')
    os.makedirs(os.path.dirname(wpng), exist_ok=True)
    _ff(['-i', src, '-filter_complex',
         'aformat=channel_layouts=mono,showwavespic=s=232x120:colors=0x2f6fdf:scale=sqrt', '-frames:v', '1', wpng])
    canvas = Image.new('RGBA', (PREVIEW, PREVIEW), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((4, 40, 251, 215), radius=14, fill=(245, 247, 250, 255), outline=(200, 205, 215, 255))
    if os.path.exists(wpng):
        with Image.open(wpng) as wv:
            wv = wv.convert('RGBA')
            canvas.paste(wv, (12, 68), wv)
    d.text((16, 48), '%s  %.1fs' % (kind.upper(), dur), fill=(40, 45, 60, 255))
    prev = os.path.join(LIB, preview_rel(base))
    os.makedirs(os.path.dirname(prev), exist_ok=True)
    canvas.save(prev + '.tmp.webp', 'WEBP', quality=82)
    os.replace(prev + '.tmp.webp', prev)
    return finish(rec, kind, files, metrics, preview_rel(base), tags)


def proc_font(rec, ctx):
    from PIL import Image, ImageDraw, ImageFont
    src = src_abs(rec, rec['src']['primary'])
    ext = os.path.splitext(src)[1].lower()
    base = rec['id']
    files = {'primary': put(src, base + ext), 'alternates': {}}
    lic = os.path.join(os.path.dirname(os.path.join(LIB, base)), 'LICENSE.txt')
    files['alternates']['licence'] = os.path.relpath(lic, LIB)
    metrics = {}
    canvas = Image.new('RGBA', (PREVIEW, PREVIEW), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((2, 2, 253, 253), radius=14, fill=(250, 250, 252, 255))
    try:
        size = 64
        while size > 8:
            f = ImageFont.truetype(src, size)
            bb = max(d.textbbox((0, 0), t, font=f)[2] for t in ('Aa Bb Cc', '012 !?'))
            if bb <= 232:
                break
            size -= 4
        metrics['family'], metrics['style'] = f.getname()
        d.text((12, 50), 'Aa Bb Cc', font=f, fill=(25, 28, 38, 255))
        d.text((12, 140), '012 !?', font=f, fill=(25, 28, 38, 255))
    except Exception as e:
        metrics['previewError'] = str(e)[:120]
    if rec['src'].get('info'):
        metrics['infoFile'] = put(src_abs(rec, rec['src']['info']), os.path.dirname(base) + '/INFORMATION.txt')
    prev = os.path.join(LIB, preview_rel(base))
    os.makedirs(os.path.dirname(prev), exist_ok=True)
    canvas.save(prev + '.tmp.webp', 'WEBP', quality=85)
    os.replace(prev + '.tmp.webp', prev)
    return finish(rec, 'font', files, metrics, preview_rel(base))


PROCS = {'image': proc_image, 'svg': proc_svg, 'atlas': proc_atlas, 'tileset': proc_tileset, 'anim': proc_anim,
         'audio': proc_audio, 'font': proc_font}

_CTX = {}


def _init_worker(ctx):
    _CTX.update(ctx)


def _run_one(rec):
    st = {'fp': rec['_fp'], 'id': rec['id']}
    try:
        st['record'] = PROCS[rec['proc']](rec, _CTX)
        st['ok'] = True
    except Exception as e:
        import traceback
        st['ok'] = False
        st['error'] = '%s: %s' % (type(e).__name__, str(e)[:300])
        st['trace'] = traceback.format_exc()[-600:]
    write_json(state_path(rec['id']), st)
    return rec['id'], st['ok']


# --------------------------------------------------------------------------- subprocess batches

def _run_batches(cmd_for_chunk, jobs, chunk, label):
    if not jobs:
        return
    chunks = [jobs[i:i + chunk] for i in range(0, len(jobs), chunk)]
    done = 0
    jdir = os.path.join(TMP, 'jobs')
    os.makedirs(jdir, exist_ok=True)

    def run(ix_chunk):
        ix, ch = ix_chunk
        jf = os.path.join(jdir, '%s-%05d.json' % (label, ix))
        with open(jf, 'w') as f:
            json.dump(ch, f)
        r = subprocess.run(cmd_for_chunk(jf), capture_output=True, text=True)
        os.remove(jf)
        return len(ch), r.returncode, (r.stderr or '')[-400:]

    with cf.ThreadPoolExecutor(WORKERS) as ex:
        for n, rc, err in ex.map(run, enumerate(chunks)):
            done += n
            if rc:
                log('  %s chunk exit %s: %s' % (label, rc, err.strip()[-200:]))
            if done % (chunk * WORKERS) < chunk or done == len(jobs):
                log('  %s %d/%d' % (label, done, len(jobs)))


def run_3d(recs):
    if not recs:
        return
    d3 = os.path.join(STATE, '3d')
    # a) conversions with Blender
    conv = []
    for r in recs:
        h = id_hash(r['id'])
        r['_stage'] = os.path.join(STAGE3D, h[:2], h + '.glb') if r['convert'] else src_abs(r, r['src']['primary'])
        r['_conv_res'] = os.path.join(STAGE3D, h[:2], h + '.json')
        if r['convert']:
            res = read_json(r['_conv_res']) or {}
            if res.get('fp') == r['_fp'] and res.get('ok') and os.path.exists(r['_stage']):
                continue
            if r['proc'] == 'charpack':
                skins = sorted(x for x in r['_skins'])
                job = {'type': 'charpack', 'model': src_abs(r, r['src']['primary']),
                       'anims': [src_abs(r, a) for a in r['src']['anims']],
                       'skin': skins[0] if skins else None}
            else:
                job = {'type': 'convert', 'input': src_abs(r, r['src']['primary'])}
                if r['pack'] in PUBLISHER_PACKS:
                    # Quaternius FBX/OBJ: textures named by the .blend sources, opacity-0 fix, clean clip names
                    job['matTextures'] = {m: src_abs(r, p) for m, p in (r['src'].get('matTextures') or {}).items()}
                    job['fixAlpha'] = True
                    job['cleanClips'] = True
            job.update(output=r['_stage'], result=r['_conv_res'])
            conv.append(job)
    log('3D: %d conversions (Blender)' % len(conv))
    _run_batches(lambda jf: ['nice', '-n', '10', BLENDER, '--background', '--factory-startup', '--python',
                             os.path.join(HERE, 'blender', 'convert.py'), '--', jf], conv, 25, 'convert')
    by_res = {r['_conv_res']: r for r in recs}
    for j in conv:
        res = read_json(j['result']) or {'ok': False, 'error': 'no result (Blender crashed?)'}
        res['fp'] = by_res[j['result']]['_fp']
        write_json(j['result'], res)
    # b) optimise with glTF-Transform
    opt, ren = [], []
    for r in recs:
        h = id_hash(r['id'])
        r['_metrics'] = os.path.join(d3, h[:2], h + '.json')
        r['_render'] = os.path.join(TMP, 'render', h[:2], h + '.png')
        r['_render_res'] = os.path.join(TMP, 'render', h[:2], h + '.json')
        if r['convert'] and not (read_json(r['_conv_res']) or {}).get('ok'):
            continue
        opt.append({'id': r['id'], 'input': r['_stage'], 'output': os.path.join(LIB, r['id'] + '.glb'),
                    'metricsOut': r['_metrics']})
        ren.append({'input': r['_stage'], 'output': r['_render'], 'result': r['_render_res']})
    log('3D: %d optimisations (glTF-Transform)' % len(opt))
    _run_batches(lambda jf: ['nice', '-n', '10', NODE, os.path.join(HERE, 'js', 'model.mjs'), jf], opt, 40, 'optimise')
    log('3D: %d preview renders (Blender Workbench)' % len(ren))
    _run_batches(lambda jf: ['nice', '-n', '10', BLENDER, '--background', '--factory-startup', '--python',
                             os.path.join(HERE, 'blender', 'render.py'), '--', jf, str(PREVIEW)], ren, 60, 'render')
    with mp.Pool(WORKERS) as pool:
        for _ in pool.imap_unordered(_finish_3d, recs, chunksize=8):
            pass


def _finish_3d(r):
    from PIL import Image
    st = {'fp': r['_fp'], 'id': r['id'], 'ok': False}
    try:
        if r['convert']:
            cres = read_json(r['_conv_res']) or {}
            if not cres.get('ok'):
                raise RuntimeError('convert failed: %s' % cres.get('error'))
        m = read_json(r['_metrics']) or {}
        if not m.get('ok'):
            raise RuntimeError('optimise failed: %s' % m.get('error'))
        metrics = m['metrics']
        rres = read_json(r['_render_res']) or {}
        prev = None
        if rres.get('ok') and os.path.exists(r['_render']):
            with Image.open(r['_render']) as im:
                prev = save_preview(im.convert('RGBA'), r['id'], False)
        else:
            metrics['previewError'] = rres.get('error', 'no render')
        files = {'primary': r['id'] + '.glb', 'alternates': {}}
        extra = []
        if metrics.get('rigged'):
            extra.append('rigged')
        if metrics.get('clips'):
            extra.append('animated')
        if r['proc'] == 'charpack':
            metrics['skins'] = r.get('_skin_ids', [])
            metrics['defaultSkin'] = (r.get('_skin_ids') or [None])[0]
        metrics['sourceFormat'] = r['src'].get('format')
        metrics['converted'] = bool(r['convert'])
        metrics['units'] = 'metres (glTF), Y-up; scale unchanged from source'
        rec = finish(r, 'model', files, metrics, prev, extra)
        rec['metrics'].pop('nodeNames', None) if len(rec['metrics'].get('nodeNames', [])) > 40 else None
        st['record'] = rec
        st['ok'] = True
    except Exception as e:
        st['error'] = str(e)[:400]
    write_json(state_path(r['id']), st)
    return r['id']


# --------------------------------------------------------------------------- driver

def load_plan():
    with open(os.path.join(WORK, 'plan.jsonl')) as f:
        return [json.loads(l) for l in f]


def run(packs, kinds=None, limit=0, retry_failed=False):
    plan = load_plan()
    slugs = {p['slug'] for p in packs}
    by_id = {r['id']: r for r in plan}
    pending = []
    for r in plan:
        if r['pack'] not in slugs:
            continue
        if kinds and r['kind'] not in kinds and r['proc'] not in kinds:
            continue
        r['_fp'] = fingerprint(r)
        st = read_json(state_path(r['id']))
        if st and st.get('fp') == r['_fp'] and (st.get('ok') or not retry_failed):
            if not st.get('ok') or all(os.path.exists(os.path.join(LIB, p)) for p in outputs_of(st['record'])):
                continue
        pending.append(r)
    if limit:
        pending = pending[:limit]
    log('process: %d pending of %d planned' % (len(pending), len(plan)))
    # charpack skins: texture assets in the same Kenney pack folder
    for r in pending:
        if r['proc'] == 'charpack':
            root = r['category'].split('/')[1]
            src_pack = '/'.join(r['sourcePath'].split('/')[:2]) + '/'
            skins = [x for x in plan if x['pack'] == r['pack'] and 'skin' in x.get('tags', []) and x['proc'] == 'image'
                     and (x['category'].startswith('kenney/%s/' % root)
                          or any(d.startswith(src_pack) for d in x.get('duplicates', [])))]
            human = sorted([s for s in skins if 'animals' not in s['category']] or skins,
                           key=lambda s: src_abs(s, s['src']['primary']))
            r['_skins'] = [src_abs(s, s['src']['primary']) for s in human]
            r['_skin_ids'] = [human[0]['id']] + [s['id'] for s in skins if s['id'] != human[0]['id']] if human else []
    two_d = [r for r in pending if r['proc'] in PROCS]
    three_d = [r for r in pending if r['proc'] in ('model', 'charpack')]
    # SVG rasterisation (sharp) for svg-only assets
    svg_ctx = {}
    svg_jobs = []
    for r in two_d:
        if r['proc'] == 'svg':
            h = id_hash(r['id'])
            png = os.path.join(TMP, 'svg', h[:2], h + '.png')
            res = os.path.join(TMP, 'svg', h[:2], h + '.json')
            svg_ctx[r['id']] = res
            svg_jobs.append({'input': src_abs(r, r['src']['primary']), 'output': png, 'result': res, 'size': PREVIEW})
    log('svg rasterise: %d' % len(svg_jobs))
    _run_batches(lambda jf: ['nice', '-n', '10', NODE, os.path.join(HERE, 'js', 'svg.mjs'), jf], svg_jobs, 100, 'svg')
    svg_res = {}
    for k, res in svg_ctx.items():
        j = read_json(res) or {}
        j['png'] = res[:-5] + '.png'
        svg_res[k] = j
    # frame-size hints for sheets named like '<prefix>_spritesheet' from numbered sibling frames
    frame_hint = {}
    by_cat = collections.defaultdict(list)
    for r in plan:
        if r.get('dims'):
            by_cat[r['category']].append(r)
    for r in two_d:
        if r['proc'] == 'image' and SHEET_NAME.search(os.path.basename(r['src']['primary'])):
            prefix = re.split(SHEET_NAME, os.path.splitext(os.path.basename(r['src']['primary']))[0])[0].strip('_- ').lower()
            sizes = collections.Counter(tuple(o['dims']) for o in by_cat[r['category']]
                                        if o is not r and os.path.basename(o['src']['primary']).lower().startswith(prefix)
                                        and prefix)
            if r['id'] in by_id and sizes:
                frame_hint[r['id']] = list(sizes.most_common(1)[0][0])
    for r in two_d:
        if r['proc'] == 'anim':
            pass
    ctx = {'svg': svg_res, 'frameHint': frame_hint}
    log('2D/audio/font: %d' % len(two_d))
    ok = fail = 0
    with mp.Pool(WORKERS, initializer=_init_worker, initargs=(ctx,)) as pool:
        for n, (aid, good) in enumerate(pool.imap_unordered(_run_one, two_d, chunksize=16), 1):
            ok += good
            fail += (not good)
            if n % 5000 == 0:
                log('  2d %d/%d (fail %d)' % (n, len(two_d), fail))
    log('2D done: ok %d fail %d' % (ok, fail))
    log('3D: %d' % len(three_d))
    run_3d(three_d)
    # intermediate renders/rasters are only needed while an asset is being processed
    for sub in ('render', 'svg', 'wave', 'jobs'):
        shutil.rmtree(os.path.join(TMP, sub), ignore_errors=True)
