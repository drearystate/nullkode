"""Stage 6: sample verification - GLBs load in three.js, sprites/webp/previews decode, audio decodes."""
import json
import os
import random
import subprocess
import time

from common import LIB, STATE, TMP, HERE, NODE, write_json, log

RASTER_KINDS = {'sprite', 'spritesheet', 'animation', 'tileset', 'ui', 'icon', 'background', 'texture'}


def _cat():
    with open(os.path.join(LIB, 'catalog.jsonl')) as f:
        return [json.loads(l) for l in f]


def run(n_glb=30, n_img=30, n_audio=10, seed=None, packs=None):
    import numpy as np
    from PIL import Image
    seed = seed if seed is not None else int(time.time())
    rnd = random.Random(seed)
    recs = _cat()
    if packs:  # ingest.py verify --pack x: check those packs only (results in verify-<packs>.json)
        recs = [r for r in recs if r['pack'] in packs]
    res = {'seed': seed, 'time': time.strftime('%Y-%m-%d %H:%M:%S'), 'glb': [], 'images': [], 'audio': []}
    # GLBs via three.js GLTFLoader
    models = [r for r in recs if r['kind'] == 'model']
    pick = rnd.sample(models, min(n_glb, len(models)))
    lst = os.path.join(TMP, 'verify-glb.json')
    with open(lst, 'w') as f:
        json.dump([{'id': r['id'], 'path': os.path.join(LIB, r['files']['primary'])} for r in pick], f)
    out = subprocess.run([NODE, os.path.join(HERE, 'js', 'verify-glb.mjs'), lst], capture_output=True, text=True)
    loaded = {x['id']: x for x in json.loads(out.stdout or '[]')}
    for r in pick:
        x = loaded.get(r['id'], {'ok': False, 'error': out.stderr[-200:]})
        m = r['metrics']
        problems = []
        if x.get('ok'):
            if abs(x['tris'] - m.get('triangles', 0)) > 0:
                problems.append('tris %s != catalog %s' % (x['tris'], m.get('triangles')))
            if len(x['clips']) != len(m.get('clips', [])):
                problems.append('clips %d != catalog %d' % (len(x['clips']), len(m.get('clips', []))))
            if m.get('rigged') and not x['skinned']:
                problems.append('rigged in catalog but no skinned mesh loaded')
        res['glb'].append({'id': r['id'], 'ok': bool(x.get('ok')) and not problems, 'load': x, 'problems': problems})
    # sprites
    imgs = [r for r in recs if r['kind'] in RASTER_KINDS and r['files']['primary'].endswith('.png')]
    for r in rnd.sample(imgs, min(n_img, len(imgs))):
        problems = []
        try:
            p = os.path.join(LIB, r['files']['primary'])
            with Image.open(p) as im:
                im.load()
                a = np.asarray(im.convert('RGBA'))
                if [im.width, im.height] != [r['metrics'].get('width'), r['metrics'].get('height')]:
                    problems.append('size %sx%s != catalog' % im.size)
            wp = (r['files'].get('alternates') or {}).get('webp')
            if wp:
                with Image.open(os.path.join(LIB, wp)) as wi:
                    b = np.asarray(wi.convert('RGBA'))
                if a.shape != b.shape:
                    problems.append('webp shape differs')
                else:
                    # lossless: compare colour where visible
                    vis = a[:, :, 3] > 0
                    if not np.array_equal(a[:, :, 3], b[:, :, 3]) or not np.array_equal(a[vis], b[vis]):
                        problems.append('webp pixels differ from png')
            with Image.open(os.path.join(LIB, r['preview'])) as pv:
                if pv.size != (256, 256):
                    problems.append('preview size %s' % (pv.size,))
            if r['kind'] == 'spritesheet' and (r['files'].get('alternates') or {}).get('json'):
                js = json.load(open(os.path.join(LIB, r['files']['alternates']['json'])))
                for name, fr in js['frames'].items():
                    f = fr['frame']
                    if f['x'] + f['w'] > a.shape[1] or f['y'] + f['h'] > a.shape[0]:
                        problems.append('atlas frame %s out of bounds' % name)
                        break
        except Exception as e:
            problems.append('%s: %s' % (type(e).__name__, e))
        res['images'].append({'id': r['id'], 'kind': r['kind'], 'ok': not problems, 'problems': problems})
    # audio
    auds = [r for r in recs if r['kind'] in ('sfx', 'music')]
    for r in rnd.sample(auds, min(n_audio, len(auds))):
        problems = []
        durs = {}
        for key, rel in [('ogg', r['files']['primary']), ('mp3', r['files']['alternates'].get('mp3'))]:
            p = os.path.join(LIB, rel)
            pr = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                                capture_output=True, text=True)
            try:
                durs[key] = float(pr.stdout.strip())
            except ValueError:
                problems.append('%s: no duration' % key)
                continue
            dec = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', p, '-f', 'null', '-'],
                                 capture_output=True, text=True)
            if dec.stderr.strip():
                problems.append('%s decode: %s' % (key, dec.stderr.strip()[:120]))
            if abs(durs[key] - r['metrics']['duration']) > 0.15:
                problems.append('%s duration %.3f vs %.3f' % (key, durs[key], r['metrics']['duration']))
        res['audio'].append({'id': r['id'], 'ok': not problems, 'durations': durs, 'problems': problems})
    for k in ('glb', 'images', 'audio'):
        good = sum(1 for x in res[k] if x['ok'])
        log('verify %s: %d/%d ok' % (k, good, len(res[k])))
        for x in res[k]:
            if not x['ok']:
                log('   FAIL %s %s' % (x['id'], x.get('problems') or x.get('load', {}).get('error')))
    if packs:
        res['packs'] = sorted(packs)
    write_json(os.path.join(STATE, 'verify-%s.json' % '-'.join(sorted(packs)) if packs else 'verify.json'), res, indent=1)
    return res
