"""Per-pack path rules: what to skip, how to build category paths, kinds and style hints.

A new pack zip can be added with rules "generic" (top folder = category root)."""
import os
import re

from common import slug

IMG_EXT = {'.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'}
MODEL_EXT = {'.glb', '.gltf', '.fbx', '.obj', '.dae', '.stl', '.3ds'}
AUDIO_EXT = {'.ogg', '.wav', '.mp3', '.flac'}
FONT_EXT = {'.ttf', '.otf', '.woff', '.woff2'}
ATLAS_EXT = {'.xml', '.json'}
META_EXT = {'.txt', '.tsx'}
AUX_EXT = {'.bin', '.mtl'}  # companions of gltf / obj, consumed by the model they belong to

SKIP_EXT = {
    '.url': 'shortcut/link file', '.html': 'pack overview page', '.htm': 'pack overview page',
    '.swf': 'Flash vector source', '.capx': 'Construct project', '.c3p': 'Construct project',
    '.unitypackage': 'Unity package', '.ai': 'Illustrator source', '.afdesign': 'Affinity source',
    '.blend': '.blend source (kept in work/ only)', '.blend1': '.blend backup', '.skp': 'SketchUp source',
    '.mat': 'Unity material', '.tmx': 'Tiled sample map', '.exe': 'executable', '.win': 'executable data',
    '.ini': 'tool config', '.pdf': 'document', '.model': 'Asset Forge source', '.psd': 'Photoshop source',
    '.zip': 'nested archive (extracted separately when useful)', '.meta': 'Unity meta', '.md': 'docs',
    '.db': 'junk', '.import': 'Godot import file', '.tres': 'Godot resource', '.tscn': 'Godot scene',
    '.gd': 'Godot script', '.godot': 'Godot project', '.cs': 'code', '.js': 'code',
}
JUNK_NAMES = {'.ds_store', 'thumbs.db', 'desktop.ini'}

SKIP_DIRS = {
    'preview': 'preview image (pack marketing)', 'previews': 'preview image (pack marketing)',
    'sample': 'sample/demo content', 'samples': 'sample/demo content', 'sample textures': 'sample/demo content',
    'source': 'editable source files', 'sources': 'editable source files',
    'unity package': 'Unity package', 'construct 3': 'Construct project', 'godot source': 'Godot sample project',
    'tiled': 'Tiled sample map (tile params read from it)', 'asset forge files': 'Asset Forge source',
    'hd affinity files': 'Affinity source', 'affinityfiles': 'Affinity source',
    'rpg character maker': 'bundled Windows tool', 'fbx(unity)': 'duplicate format (Unity-flavoured FBX)',
    'fbx (unity)': 'duplicate format (Unity-flavoured FBX)', 'unity': 'duplicate format (Unity-flavoured FBX)',
    '__macosx': 'macOS junk', 'webfonts': 'webfont duplicates',
}

FORMAT_DIRS = {
    'png', 'jpg', 'svg', 'vector', 'vectors', 'spritesheet', 'spritesheets', 'models', 'model',
    'fbx format', 'glb format', 'gltf format', 'obj format', 'dae format', 'stl format', 'fbx', 'gltf',
    'glb', 'obj', 'dae', 'stl', 'assets', 'obj and mtl files', 'font files', 'tilemap', 'tilesheet',
    'tilesheets', 'tile sets', 'tile set', 'audio', 'ogg', 'wav', 'mp3', 'font', 'fonts',
}

VARIANT_DIRS = {
    'default': '1x', 'default size': '1x', '1x': '1x', 'double': '2x', '2x': '2x', 'retina': '2x',
    'large (2×)': '2x', 'large (2x)': '2x', 'sprites x2': '2x', 'x2': '2x', '3x': '3x',
}
_px_variant = re.compile(r'^(.*?)\s*\((\d+)px\)$')
_count_suffix = re.compile(r'\s*\(\d+\)$')
_preview_file = re.compile(r'^(preview|sample|overview|screenshot|thumbnail|contents|artwork)([ _\-(].*)?\.(png|jpe?g|gif)$', re.I)
_version_suffix = re.compile(r'\s*\(?\d+(\.\d+)+\)?$|\s+\d+\.\d+$')


def _stem(fname):
    st = os.path.splitext(fname)[0]
    if os.path.splitext(st)[1].lower() in ('.gltf', '.glb', '.fbx', '.obj', '.png'):
        st = os.path.splitext(st)[0]  # e.g. 'Orc_Axe.gltf.glb'
    return st


def variant_rank(v):
    if v in (None, '1x'):
        return (0, 0)
    m = re.match(r'^(\d+)px$', v or '')
    if m:
        return (1, int(m.group(1)))
    if v == '2x':
        return (2, 0)
    return (3, 0)


def clean_dir(name):
    return _count_suffix.sub('', name).strip()


def _root_kenney(comps):
    top = comps[0]
    if top == 'Archive':
        return None, 'Kenney Archive (deprecated/replaced/remade packs)'
    if top == 'Goodies':
        return None, 'Kenney goodies (wallpapers, papercraft PDF, certificate)'
    if len(comps) < 3:
        return None, 'pack-level docs/preview'
    if top == 'Other':
        if comps[1] == 'Fonts':
            return (['fonts'], comps[1], 2), None
        return None, 'Kenney extras (%s)' % comps[1]
    if top == 'Early access':
        return ([slug(comps[1]) + '-early-access'], comps[1], 2), None
    return ([slug(comps[1])], comps[1], 2), None


def _root_kaykit(comps):
    c = comps[1:] if comps[0].startswith('The Complete KayKit') else comps
    off = len(comps) - len(c)
    if len(c) < 3:
        return None, 'pack-level docs'
    name = re.sub(r'^KayKit\s+', '', c[0])
    name = _version_suffix.sub('', name).strip()
    root = [slug(name)]
    used = 1
    m = re.match(r'^\d+\s*-\s*[A-Za-z]+\s+\d{4}\s*-\s*(.+)$', c[1])
    if m and len(c) >= 3:
        root.append(slug(m.group(1)))
        used = 2
    return (root, c[0], off + used), None


def _root_generic(comps):
    if len(comps) < 2:
        return ([], '', 0), None
    return ([slug(clean_dir(comps[0]))], comps[0], 1), None


ROOTS = {'kenney': _root_kenney, 'kaykit': _root_kaykit, 'generic': _root_generic}


def analyze(pack, rel):
    """Return (info, None) or (None, skip_reason) for a file path relative to the pack's unpack dir."""
    rel_n = rel.replace('.zip__unzipped/', '.zip/')
    comps = rel.split('/')
    fname = comps[-1]
    low = fname.lower()
    ext = os.path.splitext(low)[1]
    if low in JUNK_NAMES or '__MACOSX' in comps or fname.startswith('._'):
        return None, 'OS junk (__MACOSX/.DS_Store/Thumbs.db)'
    root_fn = ROOTS.get(pack.get('rules'), _root_generic)
    r, reason = root_fn(comps)
    if r is None:
        return None, reason
    root, pack_title, used = r
    dirs = comps[used:-1]
    parts, variant, folders = [], None, []
    for d in dirs:
        if d.endswith('.zip__unzipped'):
            base = d[:-len('.zip__unzipped')]
            low_b = base.lower()
            if any(k in low_b for k in ('sample', 'source', 'unity', 'webfont', 'godot')):
                return None, 'nested sample/source archive'
            if low_b.startswith('sprites_'):
                parts.append(slug(base))  # pre-rendered sprites of a 3D kit
                folders.append(base)
            continue  # nested content pack: transparent
        cd = clean_dir(d)
        lcd = cd.lower()
        if lcd in SKIP_DIRS:
            return None, SKIP_DIRS[lcd]
        if re.search(r'\bsamples?\b', lcd):
            return None, 'sample/demo content'
        if lcd in VARIANT_DIRS:
            variant = VARIANT_DIRS[lcd]
            continue
        m = _px_variant.match(cd)
        if m and m.group(1):
            variant = m.group(2) + 'px'
            parts.append(slug(m.group(1)))
            folders.append(m.group(1))
            continue
        folders.append(cd)
        if lcd in FORMAT_DIRS:
            continue
        parts.append(slug(cd))
    if ext in SKIP_EXT:
        return None, SKIP_EXT[ext]
    if ext in IMG_EXT and (_preview_file.match(fname) or
                           re.search(r'(^|[_\- ])(samples?|previews?)$', os.path.splitext(fname)[0], re.I)):
        return None, 'preview/sample image (pack marketing)'
    if low in ('license.txt', 'licence.txt', 'license.md'):
        return None, 'licence text (copied to library per pack)'
    return {
        'root': root, 'parts': parts, 'variant': variant, 'folders': folders,
        'packTitle': pack_title, 'ext': ext, 'stem': _stem(fname), 'rel': rel,
        'sourcePath': rel_n.replace('.zip/', '.zip!/'),
    }, None


# ---------------------------------------------------------------- kinds & styles

def _words(*strs):
    out = []
    for s in strs:
        out += [w for w in slug(s).split('-') if w]
    return out


TEXTURE_PACK_WORDS = ('prototype textures', 'pattern pack', 'retro textures', 'road textures', 'light masks',
                      'noise textures', 'patterns', 'textures')


def kind_2d(pack, info, is_svg=False):
    path_l = ('/'.join(info['folders']) + '/' + info['packTitle']).lower()
    rel_l = info['rel'].lower()
    words = set(_words(info['packTitle'], *info['folders']))
    stem_w = set(_words(info['stem']))
    if pack['rules'] == 'kenney' and 'animated characters' in info['packTitle'].lower() and 'skins' in words:
        return 'texture'
    if pack['rules'] == 'kaykit':
        return 'texture'
    if any(k in path_l for k in ('skybox',)):
        return 'background'
    if any(k in path_l for k in TEXTURE_PACK_WORDS) or 'texture' in stem_w or 'pattern' in words:
        return 'texture'
    if rel_l.startswith('ui assets/') or words & {'ui', 'hud', 'cursor', 'cursors', 'gui', 'menu', 'buttons'} \
            or 'borders' in words and 'fantasy' in words:
        return 'ui'
    if rel_l.startswith('icons/') or words & {'icons', 'icon', 'prompts', 'emote'} or 'control prompts' in path_l \
            or 'input prompts' in path_l:
        return 'icon'
    fl = [clean_dir(x).lower() for x in info['folders']]
    if any(x in ('background', 'backgrounds', 'backdrop', 'backdrops', 'parallax', 'skybox', 'skyboxes')
           or x.endswith(' backgrounds') for x in fl) or stem_w & {'background', 'bg', 'backdrop'}:
        return 'background'
    return 'sprite'


PIXEL_1BIT = ('1-bit', '1bit', 'monochrome rpg', 'monochrome pirates', 'pico 8', 'pico-8 palette')
PIXEL_WORDS = ('pixel', '8bit', '8-bit', 'tiny ', 'micro roguelike', 'pico-8', 'roguelike', 'retro textures',
               '(pixel)', '16px', '32px', 'monochrome')


def style_hints(pack, info, kind, is_svg=False, dims=None):
    p = ('/'.join(info['folders']) + '/' + info['packTitle'] + '/' + info['rel']).lower()
    hints = []
    if kind == 'model':
        hints.append(pack.get('defaultStyle3d', 'low-poly'))
        if 'voxel' in p or 'blocky' in p or 'block bits' in p:
            hints.append('voxel')
        if 'retro' in p:
            hints.append('retro')
        return hints
    if kind in ('sfx', 'music', 'font'):
        if 'retro' in p or '8bit' in p or 'pixel' in p or 'arcade' in p:
            hints.append('retro')
        if kind == 'font' and 'pixel' in p:
            hints.append('pixel-8bit')
        return hints
    if any(k in p for k in PIXEL_1BIT):
        hints.append('pixel-1bit')
    elif any(k in p for k in PIXEL_WORDS):
        hints.append('pixel-8bit')
    elif is_svg:
        hints.append('vector')
    else:
        hints.append('hd')
    for k, h in (('isometric', 'isometric'), ('axonometric', 'isometric'), ('topdown', 'top-down'),
                 ('top-down', 'top-down'), ('sprites_isometric', 'isometric'), ('sprites_side', 'side-view'),
                 ('platformer', 'side-view'), ('sketch', 'hand-drawn'), ('scribble', 'hand-drawn'),
                 ('voxel', 'voxel'), ('hexagon', 'hex'), ('outline', 'outlined')):
        if k in p and h not in hints:
            hints.append(h)
    return hints


NOISE_TAGS = {'png', 'svg', 'vector', 'default', 'double', 'retina', 'size', 'format', 'models', 'model', 'assets',
              'gltf', 'glb', 'fbx', 'obj', 'and', 'files', 'the', 'of', 'a', 'kaykit', 'kenney', 'pack', 'kit',
              'sheet', 'spritesheet', 'spritesheets', 'tilesheet', 'tilemap', 'x', 'mtl', 'audio', 'ogg', 'wav',
              'collection', 'bits', 'early', 'access', 'kay'}


def tags_for(pack, info, extra=()):
    words = _words(info['packTitle'], *info['folders'], info['stem']) + list(extra)
    out = []
    for w in words:
        if w in NOISE_TAGS or w.isdigit() or len(w) < 2:
            continue
        if re.fullmatch(r'\d+(px|x)?', w) or re.fullmatch(r'[a-z]\d+', w) and len(w) <= 2:
            continue
        if w not in out:
            out.append(w)
    return out[:24]
