"""Stage 1+2: unpack zips, then scan the unpacked trees into a deterministic plan (work/plan.jsonl)."""
import collections
import json
import multiprocessing as mp
import os
import re
import shutil
import struct
import subprocess
import xml.etree.ElementTree as ET

from common import (UNPACKED, STATE, WORK, WORKERS, read_json, write_json, sha256_file, slug, log)
import rules

# ------------------------------------------------------------------ unpack


def _zip_file_count(zp):
    out = subprocess.run(['unzip', '-Z1', zp], capture_output=True, text=True, errors='replace').stdout
    return sum(1 for l in out.splitlines() if l and not l.endswith('/'))


def _count_files(d):
    n = 0
    for _, _, fs in os.walk(d):
        n += len(fs)
    return n


def _extract_strip(zp, out):
    """Extract zp into out; when every entry sits under one top folder, that folder is dropped
    (a publisher's single-pack zip becomes out/<files>, the way the bundles lay packs out)."""
    import zipfile
    with zipfile.ZipFile(zp) as z:
        ents = [i for i in z.infolist() if not i.is_dir() and not i.filename.startswith('__MACOSX/')]
        tops = {e.filename.split('/', 1)[0] for e in ents}
        strip = ''
        if len(tops) == 1 and all('/' in e.filename for e in ents):
            strip = next(iter(tops)) + '/'
        for info in ents:
            rel = info.filename[len(strip):]
            if not rel or rel.startswith('/') or '..' in rel.split('/'):
                continue
            dst = os.path.join(out, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with z.open(info) as src, open(dst, 'wb') as f:
                shutil.copyfileobj(src, f, 1 << 20)
    return len(ents)


def zip_of(pack, rel):
    """Source zip (basename) of a file in a pack's unpack tree (multi-zip packs: by first folder)."""
    zips = pack.get('zips')
    if zips and os.path.isdir(pack['zip']):
        return zips.get(rel.split('/', 1)[0], os.path.basename(pack['zip']))
    return os.path.basename(pack['zip'])


def _unpack_multi(p):
    """Packs made of several publisher zips ("zips": {folder: zip basename}, "zip": their directory):
    each zip is extracted to <unpacked>/<slug>/<folder>/ with its single top folder dropped."""
    dest = os.path.join(UNPACKED, p['slug'])
    os.makedirs(dest, exist_ok=True)
    for folder, zname in sorted(p['zips'].items()):
        zp = os.path.join(p['zip'], zname)
        out = os.path.join(dest, folder)
        marker = os.path.join(out, '.ingest-unpacked.json')
        st = os.stat(zp)
        sig = {'zip': zname, 'size': st.st_size, 'mtime': int(st.st_mtime)}
        if (read_json(marker) or {}).get('sig') == sig:
            continue
        part = out + '.partial'
        shutil.rmtree(part, ignore_errors=True)
        n = _extract_strip(zp, part)
        shutil.rmtree(out, ignore_errors=True)
        os.replace(part, out)
        write_json(marker, {'sig': sig, 'files': n})
        log('unpack %s: %s -> %s/ (%d files)' % (p['slug'], zname, folder, n))
    stale = [d for d in os.listdir(dest) if os.path.isdir(os.path.join(dest, d)) and d not in p['zips']]
    for d in stale:
        log('unpack %s: removing %s/ (no longer in packs.json)' % (p['slug'], d))
        shutil.rmtree(os.path.join(dest, d))


def unpack(packs):
    for p in packs:
        if p.get('zips') and os.path.isdir(p['zip']):
            _unpack_multi(p)
            continue
        dest = os.path.join(UNPACKED, p['slug'])
        marker = os.path.join(dest, '.ingest-unpacked.json')
        st = os.stat(p['zip'])
        sig = {'zip': os.path.basename(p['zip']), 'size': st.st_size, 'mtime': int(st.st_mtime)}
        m = read_json(marker)
        if m and m.get('sig') == sig:
            log('unpack %s: up to date' % p['slug'])
        else:
            want = _zip_file_count(p['zip'])
            if os.path.isdir(dest) and _count_files(dest) >= want:
                log('unpack %s: adopting existing tree (%d files)' % (p['slug'], want))
            else:
                part = dest + '.partial'
                shutil.rmtree(part, ignore_errors=True)
                log('unpack %s: extracting %d files' % (p['slug'], want))
                subprocess.run(['unzip', '-q', '-o', p['zip'], '-d', part], check=False)
                shutil.rmtree(dest, ignore_errors=True)
                os.replace(part, dest)
            write_json(marker, {'sig': sig, 'files': want})
        # nested zips (Kenney ships some packs as zips inside the zip)
        for root, dirs, files in os.walk(dest):
            dirs[:] = [d for d in dirs if not d.endswith('.zip__unzipped')]
            for f in files:
                if not f.lower().endswith('.zip'):
                    continue
                zp = os.path.join(root, f)
                rel = os.path.relpath(zp, dest)
                probe, reason = rules.analyze(p, rel + '__unzipped/probe.png')
                if probe is None:
                    continue
                out = zp + '__unzipped'
                mk = os.path.join(out, '.ingest-unpacked.json')
                zst = os.stat(zp)
                zsig = {'size': zst.st_size, 'mtime': int(zst.st_mtime)}
                if (read_json(mk) or {}).get('sig') == zsig:
                    continue
                shutil.rmtree(out, ignore_errors=True)
                subprocess.run(['unzip', '-q', '-o', zp, '-d', out], check=False)
                write_json(mk, {'sig': zsig})
                log('  nested zip extracted: %s' % rel)


# ------------------------------------------------------------------ file facts (hash, dims), cached

_FACTS_PATH = os.path.join(STATE, 'filefacts.json')


def _facts_one(args):
    path, ext = args
    st = os.stat(path)
    out = {'size': st.st_size, 'mtime': int(st.st_mtime), 'sha256': sha256_file(path)}
    if ext in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
        try:
            from PIL import Image
            with Image.open(path) as im:
                out['w'], out['h'] = im.size
                out['mode'] = im.mode
        except Exception as e:
            out['imgError'] = str(e)[:200]
    return path, out


def file_facts(paths_exts):
    cache = read_json(_FACTS_PATH, {}) or {}
    todo = []
    for path, ext in paths_exts:
        c = cache.get(path)
        try:
            st = os.stat(path)
        except FileNotFoundError:
            continue
        if c and c['size'] == st.st_size and c['mtime'] == int(st.st_mtime):
            continue
        todo.append((path, ext))
    if todo:
        log('hashing %d files' % len(todo))
        with mp.Pool(WORKERS) as pool:
            for path, facts in pool.imap_unordered(_facts_one, todo, chunksize=64):
                cache[path] = facts
        write_json(_FACTS_PATH, cache)
    return cache


# ------------------------------------------------------------------ helpers

_size_suffix = re.compile(r'[-_](default|double|retina|2x|1x)$', re.I)
_frame_re = re.compile(r'^(.*?)[ _\-]?\(?(\d{1,3})\)?$')
ANIM_WORDS = set('''walk walking run running idle jump jumping attack attacking hurt hit die death dying dead fly flying
swim swimming climb climbing shoot shooting fire flame flames explode explosion blast spin spinning rotate rotating
frame frames anim animation move moving dizzy stinger vortex flap flapping fall falling push pushing cast casting slash
dash roll rolling smoke sparkle burn burning wave wavy splash open opening close closing blink talk talking sleep
sleeping ukulele glow flash pulse shine bounce float floating swing punch kick crouch duck slide land landing throw
dance cheer eat dig chop mine sit stand skid hover stun fade appear vanish teleport charge crawl wiggle bubble
bubbles spark sparks fx effect laser beam drip flicker flow ripple twinkle loop cycle step steps hop'''.split())
MOVER_FOLDERS = {'player', 'players', 'enemies', 'enemy', 'bosses', 'boss', 'npcs', 'npc', 'animals', 'characters',
                 'character', 'effects', 'effect', 'particles', 'interactive', 'monsters', 'creatures', 'animated',
                 'pre-made-characters', 'retro-monsters', 'poses', 'poses-hd', 'explosions', 'mobs'}
TILEISH = {'tile', 'tiles', 'block', 'blocks', 'letter', 'letters', 'number', 'numbers', 'digit', 'digits', 'card',
           'cards', 'rank', 'piece', 'pieces', 'element', 'brick', 'domino', 'dice', 'die', 'flag', 'flags',
           'medieval-tile', 'icon', 'icons', 'button', 'map', 'road', 'roads', 'tree', 'trees', 'rock', 'rocks',
           'house', 'building', 'wall', 'floor', 'ground', 'grass', 'water', 'cliff', 'roof', 'window', 'door',
           'fence', 'sign', 'chip', 'chips', 'ball', 'balls', 'paddle'}


def _glb_json(path):
    try:
        with open(path, 'rb') as f:
            head = f.read(20)
            if head[:4] != b'glTF':
                return None
            ln = struct.unpack('<I', head[12:16])[0]
            return json.loads(f.read(ln))
    except Exception:
        return None


def _gltf_refs(path):
    """External URIs referenced by a .gltf/.glb (buffers, images)."""
    j = _glb_json(path) if path.lower().endswith('.glb') else read_json(path)
    refs = []
    if not j:
        return refs
    for key in ('buffers', 'images'):
        for b in j.get(key, []) or []:
            u = b.get('uri')
            if u and not u.startswith('data:'):
                refs.append(os.path.normpath(os.path.join(os.path.dirname(path), u.replace('%20', ' '))))
    return refs


def _obj_refs(path):
    refs = []
    d = os.path.dirname(path)
    try:
        with open(path, errors='replace') as f:
            for line in f:
                if line.startswith('mtllib'):
                    mtl = os.path.join(d, line.split(None, 1)[1].strip())
                    refs.append(os.path.normpath(mtl))
                    try:
                        with open(mtl, errors='replace') as mf:
                            for ml in mf:
                                if ml.strip().lower().startswith('map_'):
                                    refs.append(os.path.normpath(os.path.join(d, ml.split()[-1])))
                    except FileNotFoundError:
                        pass
                elif line.startswith('v '):
                    break
    except Exception:
        pass
    return refs


def _parse_atlas_xml(path):
    try:
        root = ET.parse(path).getroot()
    except Exception:
        return None
    if root.tag != 'TextureAtlas':
        return None
    return {'imagePath': root.get('imagePath') or '', 'frames': len(root.findall('SubTexture'))}


def _tile_hints(pack_dir_abs, files_by_dir):
    """Collect tile-size hints from Kenney 'Tilesheet*.txt' and Tiled .tsx files under a pack folder."""
    hints = []
    for root, _, files in os.walk(pack_dir_abs):
        for f in files:
            p = os.path.join(root, f)
            lf = f.lower()
            if lf.endswith('.tsx'):
                try:
                    t = ET.parse(p).getroot()
                    img = t.find('image')
                    hints.append({'src': 'tsx', 'file': p, 'image': os.path.basename(img.get('source')) if img is not None else None,
                                  'tw': int(t.get('tilewidth')), 'th': int(t.get('tileheight')),
                                  'spacing': int(t.get('spacing') or 0), 'margin': int(t.get('margin') or 0),
                                  'columns': int(t.get('columns') or 0), 'count': int(t.get('tilecount') or 0)})
                except Exception:
                    pass
            elif lf.endswith('.txt') and ('tilesheet' in lf or 'tile information' in lf or 'tilemap' in lf):
                try:
                    txt = open(p, errors='replace').read()
                except Exception:
                    continue
                m = re.search(r'Tile size\s*\W*\s*(\d+)\s*px\s*[x×]\s*(\d+)', txt, re.I)
                s = re.search(r'Space between tiles\s*\W*\s*(\d+)\s*px', txt, re.I)
                if m:
                    key = re.search(r'\(([^)]+)\)', f)
                    hints.append({'src': 'txt', 'file': p, 'key': key.group(1).lower() if key else None,
                                  'tw': int(m.group(1)), 'th': int(m.group(2)),
                                  'spacing': int(s.group(1)) if s else 0, 'margin': 0})
    return hints


# ------------------------------------------------------------------ Quaternius: textures from the .blend sources

_BLEND_CACHE = os.path.join(STATE, 'blend-textures.json')
# Old character packs whose .blend points at a texture that isn't in the zip: use the pack's default skin.
# Packs whose .blend files name textures that ship under other names: material -> shipped file.
QUAT_MATERIAL_TEXTURES = {
    'Textured Stylized Trees': {'Bark': 'Textures/Tree_Bark.jpg', 'Birch_Bark': 'Textures/Birch_Bark.png',
                                'Birch_Leaves': 'Textures/Birch_Leaves_Yellow.png',  # .blend: birchYellow.png
                                'Tree_Leaves': 'Textures/Tree_Leaves.png', 'Pine_Leaves': 'Textures/Pine_Leaves.png'},
    # .blend: Texture.png (not shipped); Texture_Light is the plain variant, the other colours are texture assets
    'Ultimate Textured Building Pack': {'Texture': 'Textured Models/Textures/Texture_Light.png'},
}
QUAT_TEXTURE_FALLBACK = {
    'Woman Animated': 'Blends/LightSkin.png',
    'Man Animated': 'Blend/Textures/ClothedLightSkin.png',
    'Zombie': 'Blends/ZombieTexture.png',
}


def _probe_blends(paths):
    """{blend path: {'materials': {mat: [image basename, ...]}}} via Blender (cached by size+mtime)."""
    import concurrent.futures as cf
    from common import BLENDER, HERE, TMP
    cache = read_json(_BLEND_CACHE, {}) or {}
    todo = []
    for p in paths:
        st = os.stat(p)
        c = cache.get(p)
        if not c or c.get('sig') != [st.st_size, int(st.st_mtime)]:
            todo.append(p)
    if todo:
        log('blend texture probe: %d .blend files' % len(todo))
        jdir = os.path.join(TMP, 'blendprobe')
        os.makedirs(jdir, exist_ok=True)
        chunks = [todo[i:i + 40] for i in range(0, len(todo), 40)]

        def run(ix):
            jf, of = os.path.join(jdir, 'j%04d.json' % ix), os.path.join(jdir, 'o%04d.json' % ix)
            with open(jf, 'w') as f:
                json.dump(chunks[ix], f)
            subprocess.run(['nice', '-n', '10', BLENDER, '--background', '--factory-startup', '--python',
                            os.path.join(HERE, 'blender', 'blend-textures.py'), '--', jf, of],
                           capture_output=True, text=True, timeout=1800)
            return read_json(of, {}) or {}
        with cf.ThreadPoolExecutor(min(8, WORKERS)) as ex:
            for res in ex.map(run, range(len(chunks))):
                for p, r in res.items():
                    st = os.stat(p)
                    r['sig'] = [st.st_size, int(st.st_mtime)]
                    cache[p] = r
        shutil.rmtree(jdir, ignore_errors=True)
        write_json(_BLEND_CACHE, cache)
    return cache


def _attach_blend_textures(pack, base, recs):
    """FBX/OBJ exports in Quaternius packs carry material names but no texture links; the .blend with the
    same name does. rec.src.matTextures = {material: image path in the pack}, used by blender/convert.py."""
    by_pack = collections.defaultdict(list)
    for r in recs:
        by_pack[r['_needTex']['rel'].split('/', 1)[0]].append(r)
    files_in = {}
    want = {}
    for top, rs in by_pack.items():
        files = []
        for root, _, fs in os.walk(os.path.join(base, top)):
            files += [os.path.join(root, f) for f in fs]
        files_in[top] = files
        blends = {}
        for f in files:
            if f.lower().endswith('.blend'):
                blends.setdefault(slug(os.path.splitext(os.path.basename(f))[0]), []).append(f)
        for r in rs:
            cands = blends.get(slug(r['_needTex']['stem'])) or []
            if cands:
                want[id(r)] = sorted(cands, key=len)[0]
    probed = _probe_blends(sorted(set(want.values()))) if want else {}
    n_tex = 0
    for top, rs in by_pack.items():
        imgs = collections.defaultdict(list)
        for f in files_in[top]:
            if os.path.splitext(f)[1].lower() in ('.png', '.jpg', '.jpeg'):
                imgs[os.path.basename(f).lower()].append(f)
        for r in rs:
            info = r.pop('_needTex')
            bl = want.get(id(r))
            mats = ((probed.get(bl) or {}).get('materials') or {}) if bl else {}
            out = {}
            for mat, names in mats.items():
                for nm in names:
                    hits = imgs.get(os.path.basename(nm).lower())
                    if hits:
                        # prefer the copy in a Textures folder, then the shortest path
                        hits = sorted(hits, key=lambda h: ('/textures/' not in h.lower(), len(h)))
                        out[mat] = os.path.relpath(hits[0], base)
                        break
            for mat, names in mats.items():
                alias = QUAT_MATERIAL_TEXTURES.get(top, {}).get(mat)
                if names and mat not in out and alias and os.path.exists(os.path.join(base, top, alias)):
                    out[mat] = os.path.join(top, alias)
            if mats and not out and any(mats.values()) and top in QUAT_TEXTURE_FALLBACK:
                fb = os.path.join(base, top, QUAT_TEXTURE_FALLBACK[top])
                if os.path.exists(fb):
                    out = {m: os.path.relpath(fb, base) for m, n in mats.items() if n}
            if out:
                r['src']['matTextures'] = out
                n_tex += 1
            if bl:
                r['src']['blend'] = os.path.relpath(bl, base)
    log('  %s: %d FBX/OBJ models, %d got textures from their .blend' % (pack['slug'], len(recs), n_tex))


# ------------------------------------------------------------------ scan


def scan(packs):
    plan, skipped = [], []
    for p in packs:
        r, s = scan_pack(p)
        plan += r
        skipped += s
    # assign unique ids (deterministic order)
    plan.sort(key=lambda r: (r['pack'], r['_key'], r['src']['primary']))
    seen = collections.Counter()
    for r in plan:
        base = r['_key']
        seen[base] += 1
        r['id'] = base if seen[base] == 1 else '%s-%d' % (base, seen[base])
        del r['_key']
    os.makedirs(WORK, exist_ok=True)
    with open(os.path.join(WORK, 'plan.jsonl.tmp'), 'w') as f:
        for r in plan:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    os.replace(os.path.join(WORK, 'plan.jsonl.tmp'), os.path.join(WORK, 'plan.jsonl'))
    with open(os.path.join(STATE, 'skipped.jsonl'), 'w') as f:
        for s in skipped:
            f.write(json.dumps(s, ensure_ascii=False) + '\n')
    kinds = collections.Counter((r['pack'], r['kind']) for r in plan)
    log('plan: %d assets, %d skipped files' % (len(plan), len(skipped)))
    for k, v in sorted(kinds.items()):
        log('  %-14s %-12s %d' % (k[0], k[1], v))
    return plan


def scan_pack(pack):
    base = os.path.join(UNPACKED, pack['slug'])
    kept, skipped = [], []
    for root, dirs, files in os.walk(base):
        dirs.sort()
        for f in sorted(files):
            if f.startswith('.ingest-'):
                continue
            ap = os.path.join(root, f)
            rel = os.path.relpath(ap, base)
            info, reason = rules.analyze(pack, rel)
            if info is None:
                skipped.append({'pack': pack['slug'], 'path': rel, 'reason': reason})
                continue
            info['abs'] = ap
            kept.append(info)
    facts = file_facts([(i['abs'], i['ext']) for i in kept if i['ext'] not in rules.META_EXT])
    by_abs = {i['abs']: i for i in kept}
    consumed = {}  # abs -> reason (files used by another asset)
    recs = []

    def skip(info, reason):
        skipped.append({'pack': pack['slug'], 'path': info['rel'], 'reason': reason})

    def cat_of(info):
        return tuple(info['root'] + info['parts'])

    def base_rec(info, kind, proc, name_stem=None, extra_tags=()):
        stem = name_stem if name_stem is not None else info['stem']
        cat = '/'.join((pack['slug'],) + cat_of(info))
        return {
            '_key': cat + '/' + slug(stem), 'pack': pack['slug'], 'kind': kind, 'proc': proc,
            'category': cat, 'name': slug(stem).replace('-', ' '),
            'style': [], 'tags': rules.tags_for(pack, info, extra_tags),
            'sourceZip': zip_of(pack, info['rel']), 'sourcePath': info['sourcePath'],
            'src': {'primary': info['rel']}, 'srcSha': facts.get(info['abs'], {}).get('sha256'),
        }

    # ---------------- 3D models
    models = collections.defaultdict(list)
    charpacks = collections.defaultdict(lambda: {'models': [], 'anims': [], 'skins': []})
    for i in kept:
        if i['ext'] not in rules.MODEL_EXT:
            continue
        if pack['rules'] == 'kenney' and i['packTitle'].startswith('Animated Characters'):
            fl = [x.lower() for x in i['folders']]
            cp = charpacks[tuple(i['root'])]
            cp['title'] = i['packTitle']
            if 'animations' in fl:
                cp['anims'].append(i)
                continue
            if 'models' in fl or 'model' in fl:
                cp['models'].append(i)
                continue
        if 'preparts' in i:  # publisher packs: FBX/x, OBJ/x, glTF/x (and FBX/Details/x) are one model
            models[(tuple(i['root'] + i['preparts']), slug(i['stem']))].append(i)
            continue
        models[(cat_of(i), slug(i['stem']))].append(i)
    order = {'.glb': 0, '.gltf': 1, '.fbx': 2, '.obj': 3, '.dae': 4, '.3ds': 5, '.stl': 6}
    for key, group in sorted(models.items()):
        group.sort(key=lambda i: (order.get(i['ext'], 9), i['rel']))
        best = group[0]
        for other in group[1:]:
            skip(other, 'duplicate format of same model (%s kept)' % best['ext'][1:].upper())
            if other['ext'] == '.obj':
                for ref in _obj_refs(other['abs']):
                    consumed.setdefault(ref, 'material/texture of a duplicate-format model')
            if other['ext'] == '.gltf':
                for ref in _gltf_refs(other['abs']):
                    consumed.setdefault(ref, 'buffer/texture of a duplicate-format model')
        if best['ext'] in ('.glb', '.gltf'):
            refs = _gltf_refs(best['abs'])
            for ref in refs:
                consumed[ref] = 'embedded into model GLB'
            proc = 'model'
            conv = False
        else:
            refs = _obj_refs(best['abs']) if best['ext'] == '.obj' else []
            for ref in refs:
                consumed[ref] = 'embedded into model GLB'
            proc = 'model'
            conv = True
        rec = base_rec(best, 'model', proc)
        rec['src']['refs'] = sorted(os.path.relpath(r, base) for r in refs if os.path.exists(r))
        rec['src']['format'] = best['ext'][1:]
        rec['convert'] = conv
        rec['style'] = rules.style_hints(pack, best, 'model')
        tl = [x.lower() for x in best['folders']]
        if 'animations' in tl:
            rec['tags'].append('animation-library')
        if conv and pack['rules'] == 'quaternius':
            rec['_needTex'] = best
        recs.append(rec)
    if pack['rules'] == 'quaternius':
        _attach_blend_textures(pack, base, [r for r in recs if r.get('_needTex')])
    for root, cp in sorted(charpacks.items()):
        anims = sorted(cp['anims'], key=lambda i: i['rel'])
        for a in anims:
            skip(a, 'merged as animation clips into the character GLBs')
        for mi in sorted(cp['models'], key=lambda i: i['rel']):
            rec = base_rec(mi, 'model', 'charpack')
            rec['src']['anims'] = [a['rel'] for a in anims]
            rec['src']['format'] = 'fbx'
            rec['convert'] = True
            rec['style'] = rules.style_hints(pack, mi, 'model')
            rec['tags'] += ['character', 'animated', 'rigged']
            recs.append(rec)
    # Kenney: images that live under a Models/ folder are model textures (embedded in GLBs)
    for i in kept:
        if i['ext'] in rules.IMG_EXT and pack['rules'] == 'kenney':
            fl = [x.lower() for x in i['folders']]
            if ('models' in fl or 'model' in fl) and i['abs'] not in consumed:
                consumed[i['abs']] = 'model texture (embedded in GLB)'

    # ---------------- atlases
    atlas_for_png = {}
    for i in kept:
        if i['ext'] == '.xml':
            a = _parse_atlas_xml(i['abs'])
            if not a:
                skip(i, 'non-atlas XML')
                continue
            d = os.path.dirname(i['abs'])
            cands = [os.path.join(d, a['imagePath']), os.path.join(d, i['stem'] + '.png')]
            png = next((c for c in cands if c in by_abs), None)
            if not png:
                skip(i, 'atlas XML without its image')
                continue
            atlas_for_png[png] = i
        elif i['ext'] == '.json':
            j = read_json(i['abs'])
            if isinstance(j, dict) and 'frames' in j:
                png = os.path.join(os.path.dirname(i['abs']), (j.get('meta') or {}).get('image') or i['stem'] + '.png')
                if png in by_abs:
                    atlas_for_png[png] = i
                    continue
            skip(i, 'non-atlas JSON')
        elif i['ext'] in rules.AUX_EXT:
            skip(i, consumed.get(i['abs']) or 'model companion file (bin/mtl) of an unused format')
        elif i['ext'] in rules.META_EXT:
            skip(i, 'text/docs (tile metadata read where relevant)')

    # ---------------- fonts
    for i in kept:
        if i['ext'] in rules.FONT_EXT:
            rec = base_rec(i, 'font', 'font')
            rec['style'] = rules.style_hints(pack, i, 'font')
            info_txt = os.path.join(os.path.dirname(os.path.dirname(i['abs'])), 'Information.txt')
            if os.path.exists(info_txt):
                rec['src']['info'] = os.path.relpath(info_txt, base)
            recs.append(rec)

    # ---------------- audio
    aud = collections.defaultdict(list)
    for i in kept:
        if i['ext'] in rules.AUDIO_EXT:
            aud[(cat_of(i), slug(i['stem']))].append(i)
    aorder = {'.ogg': 0, '.wav': 1, '.flac': 2, '.mp3': 3}
    for key, group in sorted(aud.items()):
        group.sort(key=lambda i: (aorder.get(i['ext'], 9), i['rel']))
        for o in group[1:]:
            skip(o, 'duplicate audio format')
        i = group[0]
        words = set(rules._words(i['packTitle'], *i['folders'], i['stem']))
        rec = base_rec(i, 'sfx', 'audio')
        rec['musicHint'] = bool(words & {'music', 'loop', 'loops', 'jingle', 'jingles', 'song', 'songs', 'theme',
                                         'idents', 'soundtrack', 'bgm'})
        rec['style'] = rules.style_hints(pack, i, 'sfx')
        recs.append(rec)

    # ---------------- 2D images
    TILESET_DIRS = {'tilemap', 'tilesheet', 'tilesheets', 'tile sets', 'tile set', 'tilesets', 'tileset'}
    groups = collections.OrderedDict()
    for i in kept:
        if i['ext'] not in rules.IMG_EXT:
            continue
        if i['abs'] in consumed:
            skip(i, consumed[i['abs']])
            continue
        fl = {x.lower() for x in i['folders']}
        stem = i['stem']
        is_tileset = (bool(fl & TILESET_DIRS) or re.search(r'tile[_ -]?set|tilemap|tilesheet', stem, re.I)) \
            and i['abs'] not in atlas_for_png
        variant = i['variant']
        m = _size_suffix.search(stem)
        if m:
            stem = stem[:m.start()]
            variant = rules.VARIANT_DIRS.get(m.group(1).lower(), variant)
        if is_tileset and re.search(r'[_-]packed$', stem):
            stem = re.sub(r'[_-]packed$', '', stem)
            variant = 'packed'
        key = (cat_of(i), slug(stem))
        g = groups.setdefault(key, {'members': {}, 'tileset': False, 'stem': stem})
        g['tileset'] = g['tileset'] or bool(is_tileset)
        mk = (i['ext'] if i['ext'] != '.jpeg' else '.jpg', variant or '1x')
        if mk in g['members']:
            skip(i, 'duplicate of same image in another folder')
            continue
        g['members'][mk] = i

    pack_tile_hints = {}
    image_recs = []
    for key, g in groups.items():
        mem = g['members']
        rasters = sorted([k for k in mem if k[0] != '.svg'], key=lambda k: (rules.variant_rank(k[1]), k[0]))
        svgs = sorted([k for k in mem if k[0] == '.svg'], key=lambda k: rules.variant_rank(k[1]))
        if rasters:
            pk = rasters[0]
        else:
            pk = svgs[0]
        pi = mem[pk]
        alts = {}
        for k in rasters[1:]:
            if k[1] == 'packed':
                alts['packed'] = mem[k]['rel']
            else:
                alts[k[1] if k[0] == pk[0] else k[1] + k[0]] = mem[k]['rel']
        for k in svgs:
            if k == pk:
                continue
            alts['svg' if k[1] == '1x' else 'svg-' + k[1]] = mem[k]['rel']
        is_svg = pk[0] == '.svg'
        if pi['abs'] in atlas_for_png:
            kind, proc = 'spritesheet', 'atlas'
        elif g['tileset'] and not is_svg:
            kind, proc = 'tileset', 'tileset'
        else:
            kind = rules.kind_2d(pack, pi, is_svg)
            proc = 'svg' if is_svg else 'image'
            if is_svg and re.match(r'^(vector|sheet)', pi['stem'], re.I):
                kind = 'spritesheet'
        if pi.get('frameSize') and not is_svg and proc != 'atlas':
            # pixel art named 'Run (32x32).png': frame size from the file name
            fl_l = [x.lower() for x in pi['folders']]
            if kind == 'tileset' or 'tilesets' in fl_l or pi['stem'].lower() in ('terrain', 'decorations'):
                kind, proc = 'tileset', 'tileset'
            elif kind != 'background':
                kind = 'spritesheet'
        rec = base_rec(pi, kind, proc, name_stem=g['stem'])
        if pack['rules'] == 'quaternius' and (kind == 'texture' or (kind == 'icon' and 'icons' not in pi['parts'])):
            # textures get their own 'textures' folder so they never share an id with the model they belong to
            pre = pi['root'] + pi['preparts']
            rest = pi['parts'][len(pi['preparts']):] if pi['parts'][:len(pi['preparts'])] == pi['preparts'] else []
            rec['category'] = '/'.join([pack['slug']] + pre + [kind + 's'] + rest)
            rec['_key'] = rec['category'] + '/' + slug(g['stem'])
        if pi.get('frameSize') and not is_svg and proc != 'atlas':
            rec['frameSize'] = pi['frameSize']
        fps = (pack.get('fps') or {}).get(pi['rel'].split('/', 1)[0])
        if fps and not is_svg:
            rec['fps'] = fps  # the publisher's stated animation speed (itch page)
        rec['src']['alts'] = alts
        f = facts.get(pi['abs'], {})
        if 'w' in f:
            rec['dims'] = [f['w'], f['h']]
        rec['style'] = rules.style_hints(pack, pi, kind, is_svg)
        if proc == 'atlas':
            ax = atlas_for_png[pi['abs']]
            rec['src']['atlas'] = ax['rel']
            alt_atlas = {}
            for k in rasters[1:]:
                a2 = atlas_for_png.get(mem[k]['abs'])
                if a2:
                    alt_atlas[k[1]] = a2['rel']
            rec['src']['altAtlas'] = alt_atlas
        if proc == 'tileset':
            pdir = os.path.join(base, *pi['rel'].split('/')[:2]) if pack['rules'] == 'kenney' else os.path.dirname(pi['abs'])
            if pdir not in pack_tile_hints:
                pack_tile_hints[pdir] = _tile_hints(pdir, None)
            rec['tileHints'] = pack_tile_hints[pdir]
            # sibling tile sizes (most common size of single images in the same pack/category tree)
            rec['_tilepack'] = pdir
        if pack['rules'] == 'kenney' and rec['kind'] == 'texture' and 'skins' in [x.lower() for x in pi['folders']]:
            rec['tags'].append('skin')
        image_recs.append(rec)

    # tileset: most common single-image size under the same pack folder (fallback tile size)
    size_counts = collections.defaultdict(collections.Counter)
    for rec in image_recs:
        if rec['proc'] == 'image' and rec.get('dims'):
            ap = os.path.join(base, rec['src']['primary'])
            for pdir in pack_tile_hints:
                if ap.startswith(pdir + '/'):
                    w, h = rec['dims']
                    if w <= 128 and h <= 128:
                        size_counts[pdir][(w, h)] += 1
    for rec in image_recs:
        if rec['proc'] == 'tileset':
            sc = size_counts.get(rec.pop('_tilepack'))
            if rec.get('frameSize'):
                rec['siblingTileSize'] = list(rec['frameSize'])
            elif sc:
                rec['siblingTileSize'] = list(sc.most_common(1)[0][0])

    # ---------------- frame grouping (numbered single images -> animation)
    cand = collections.defaultdict(list)
    for rec in image_recs:
        if rec['proc'] != 'image' or rec['kind'] not in ('sprite',) or rec['src']['alts'].get('svg'):
            continue
        stem = os.path.splitext(os.path.basename(rec['src']['primary']))[0]
        m = _frame_re.match(stem)
        if not m or not m.group(1).strip(' _-') or m.group(1).strip(' _-').isdigit():
            continue
        cand[(rec['category'], m.group(1).strip(' _-').lower())].append((int(m.group(2)), rec, m.group(1).strip(' _-')))
    absorbed = set()
    anim_recs = []
    for (cat, basename), items in sorted(cand.items()):
        if len(items) < 2 or len(items) > 32:
            continue
        nums = sorted(n for n, _, _ in items)
        if len(set(nums)) != len(nums) or nums[0] not in (0, 1) or nums[-1] - nums[0] + 1 != len(nums):
            continue
        dims = {tuple(r.get('dims') or ()) for _, r, _ in items}
        if len(dims) != 1 or not next(iter(dims)):
            continue
        words = set(rules._words(basename))
        first = items[0][1]
        folder_words = set(slug(x) for x in first['tags'])
        fparts = set(cat.split('/'))
        mover = bool(fparts & MOVER_FOLDERS)
        is_anim = bool(words & ANIM_WORDS) or (mover and not words & TILEISH) \
            or (len(items) in (8, 16, 32) and not words & TILEISH and not fparts & {'tiles'})
        if not is_anim:
            continue
        items.sort(key=lambda t: t[0])
        r0 = items[0][1]
        rec = dict(r0)
        rec['src'] = {'primary': r0['src']['primary'], 'frames': [r['src']['primary'] for _, r, _ in items], 'alts': {}}
        rec['kind'] = 'animation'
        rec['proc'] = 'anim'
        rec['name'] = slug(items[0][2]).replace('-', ' ')
        rec['_key'] = cat + '/' + slug(items[0][2])
        rec['tags'] = list(dict.fromkeys([t for t in r0['tags'] if not t.isdigit()] + ['animation', 'frames']))
        if not words & ANIM_WORDS and len(items) in (8, 16, 32):
            rec['tags'].append('rotation-or-direction-frames')
        rec['frameShas'] = [r['srcSha'] for _, r, _ in items]
        for _, r, _ in items:
            absorbed.add(id(r))
        anim_recs.append(rec)
    image_recs = [r for r in image_recs if id(r) not in absorbed] + anim_recs

    # ---------------- dedupe identical primary files within the pack
    recs += image_recs
    by_sha = collections.defaultdict(list)
    for r in recs:
        if r['proc'] in ('anim', 'charpack') or not r.get('srcSha'):
            continue
        by_sha[(r['srcSha'], r['proc'])].append(r)
    drop = set()
    for (sha, _), rs in by_sha.items():
        if len(rs) < 2:
            continue
        rs.sort(key=lambda r: ('/all/' in ('/' + r['src']['primary'].lower() + '/').replace(' (', '/('),
                               '/All/' in r['src']['primary'], len(r['src']['primary']), r['src']['primary']))
        keep = rs[0]
        for r in rs[1:]:
            drop.add(id(r))
            skipped.append({'pack': pack['slug'], 'path': r['src']['primary'],
                            'reason': 'identical file (same sha256) already kept'})
            keep.setdefault('duplicates', []).append(r['sourcePath'])
    recs = [r for r in recs if id(r) not in drop]
    return recs, skipped
