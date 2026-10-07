"""Shared paths and helpers for the game-asset ingest pipeline."""
import hashlib
import json
import os
import re
import shutil
import sys
import time
import unicodedata

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../nk-games/ingest
GAMES = os.path.dirname(HERE)  # the games/ folder
WORK = os.environ.get('NK_GAMES_WORK') or os.path.join(GAMES, 'work')
LIB = os.environ.get('NK_GAME_ASSETS') or os.path.join(GAMES, 'library')
PACKS_DIR = os.path.join(WORK, 'packs')  # made by prepare-packs.py
UNPACKED = os.path.join(WORK, 'unpacked')
STATE = os.path.join(WORK, 'state')
ASSET_STATE = os.path.join(STATE, 'assets')
STAGE3D = os.path.join(WORK, 'stage3d')
TMP = os.path.join(WORK, 'tmp')
SHEETS = os.path.join(WORK, 'sheets')
PREVIEWS = os.path.join(LIB, '_previews')
URL_PREFIX = '/game-assets'
BLENDER = os.environ.get('NK_BLENDER') or shutil.which('blender') or 'blender'
NODE = shutil.which('node') or 'node'
WORKERS = int(os.environ.get('NK_WORKERS', '16'))
PIPELINE_VERSION = 3  # bump to force full reprocessing

for d in (WORK, UNPACKED, STATE, ASSET_STATE, STAGE3D, TMP):
    os.makedirs(d, exist_ok=True)

_camel1 = re.compile(r'([a-z])([A-Z])')
_camel2 = re.compile(r'([A-Z]+)([A-Z][a-z])')


def slug(s):
    """'tree_pineSmallA' -> 'tree-pine-small-a', 'Platformer Pack (Pixel)' -> 'platformer-pack-pixel'."""
    s = unicodedata.normalize('NFKD', str(s))
    s = s.replace('×', 'x').replace('&', ' ').replace("'", '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = _camel2.sub(r'\1-\2', s)
    s = _camel1.sub(r'\1-\2', s)
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'x'


def sha256_file(path, bufsize=1 << 20):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while True:
            b = f.read(bufsize)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def id_hash(asset_id):
    return hashlib.sha1(asset_id.encode()).hexdigest()


def state_path(asset_id):
    h = id_hash(asset_id)
    return os.path.join(ASSET_STATE, h[:2], h + '.json')


def read_json(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path, obj, indent=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp%d' % os.getpid()
    with open(tmp, 'w') as f:
        json.dump(obj, f, indent=indent, ensure_ascii=False)
    os.replace(tmp, path)


def atomic_copy(src, dst):
    """Copy src to dst unless dst already has identical size+content hash marker."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getsize(dst) == os.path.getsize(src):
        # cheap check first, then content compare
        if sha256_file(dst) == sha256_file(src):
            return False
    tmp = dst + '.tmp%d' % os.getpid()
    shutil.copyfile(src, tmp)
    os.replace(tmp, dst)
    return True


def lib_path(rel):
    return os.path.join(LIB, rel)


def url_of(rel):
    return URL_PREFIX + '/' + rel.replace(os.sep, '/')


def load_packs():
    """packs.json, the zips from PACKS_DIR (prepare-packs.py puts them there). A pack whose zip isn't there
    is skipped. A pack of several zips ("zips": {folder: zip}, "zip": their folder) takes the zips that are
    there: the ones packs.json lists, and any other pack prepare-packs.py added (ids from its name)."""
    out = []
    for p in read_json(os.path.join(HERE, 'packs.json')) or []:
        p['zip'] = os.path.join(PACKS_DIR, p['zip'])
        if 'zips' in p:
            have = sorted(n for n in os.listdir(p['zip']) if n.endswith('.zip')) if os.path.isdir(p['zip']) else []
            p['zips'] = {n[:-4]: n for n in have}
            if not have:
                log('pack %s: no zips in %s (run prepare-packs.py), skipped' % (p['slug'], p['zip']))
                continue
            out.append(p)
        elif os.path.exists(p['zip']):
            out.append(p)
        else:
            log('pack %s: no %s (run prepare-packs.py), skipped' % (p['slug'], p['zip']))
    return out


def nice_self():
    try:
        os.nice(10 - os.nice(0)) if os.nice(0) < 10 else None
    except OSError:
        pass


def log(msg):
    print(time.strftime('%H:%M:%S'), msg, flush=True)
