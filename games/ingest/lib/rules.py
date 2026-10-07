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


def clean_pack_name(name):
    """'Ultimate Stylized Nature - May 2022' / 'Ships by @Quaternius' / 'Some Kit[Standard]'
    -> the pack's own name (first id category)."""
    s = re.sub(r'\s*\[[^\]]*\]\s*$', '', name)
    s = re.sub(r'\s*by @?Quaternius$', '', s, flags=re.I)
    s = re.sub(r'\s*-\s*Quaternius$', '', s, flags=re.I)
    s = re.sub(r'\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}$', '', s, flags=re.I)
    return s.strip()


def _root_publisher(comps):
    """Publisher packs (quaternius, pixel-frog): <pack folder>/... -> <publisher>/<pack>/..."""
    if len(comps) < 2:
        return None, 'pack-level docs'
    return ([slug(clean_pack_name(comps[0]))], clean_pack_name(comps[0]), 1), None


ROOTS = {'kenney': _root_kenney, 'kaykit': _root_kaykit, 'generic': _root_generic,
         'quaternius': _root_publisher, 'pixel-frog': _root_publisher}

# Per-rule-set extras (kept out of the shared tables so existing packs' ids never change).
EXTRA_SKIP_DIRS = {
    'quaternius': {
        'humanoid rig': 'duplicate format (Unity humanoid-rig FBX, no animations)',
        'humanoid rigs': 'duplicate format (Unity humanoid-rig FBX, no animations)',
        'humanoid rig versions': 'duplicate format (Unity humanoid-rig FBX, no animations)',
        'all together': 'all-in-one master file (every model is ingested on its own)',
        'separate skeletal meshes and animations':
            'modular body-part meshes + shared animation FBX (each outfit is ingested as a complete rigged character with its clips)',
        'unreal normals': 'duplicate normal maps (Unreal green-channel convention)',
    },
    'pixel-frog': {'aseprite': 'Aseprite source (editable; the PNG exports are kept)'},
}
EXTRA_FORMAT_DIRS = {
    'quaternius': {'blends', 'blend', 'blender', 'textures', 'texture', 'exports', 'glb (godot-unreal)', 'fbx'},
    'pixel-frog': {'sprites'},
}
EXTRA_SKIP_EXT = {
    '.gif': 'animated preview GIF (pack marketing)', '.mp4': 'preview video (pack marketing)',
    '.docx': 'docs (licence copied to library per pack)', '.aseprite': 'Aseprite source (editable; the PNG exports are kept)',
}
_doc_image = re.compile(r'^(preview\w*|colorspreview|color guide|\w*_atlas_help|importing_\w*|texturetutorial|hello|20 enemies)'
                        r'\.(png|jpe?g)$', re.I)
_frame_size = re.compile(r'\s*\((\d{1,3})x(\d{1,3})\)\s*$')
_num_prefix = re.compile(r'^\d{1,2}-(?=\D)')


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
    rs = pack.get('rules')
    if rs in EXTRA_SKIP_DIRS:
        return _analyze_publisher(pack, rel, rel_n, comps, fname, low, ext, root, pack_title, used)
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


def _analyze_publisher(pack, rel, rel_n, comps, fname, low, ext, root, pack_title, used):
    """quaternius / pixel-frog. Besides the category parts, records `preparts` (the parts before the first
    format folder: models of one pack/section in FBX/, OBJ/, glTF/ ... are the same model) and, for pixel
    art named 'Run (32x32).png', the frame size from the file name."""
    rs = pack['rules']
    skip_dirs = EXTRA_SKIP_DIRS[rs]
    fmt_dirs = FORMAT_DIRS | EXTRA_FORMAT_DIRS[rs]
    parts, folders, preparts, seen_fmt = [], [], None, False
    for d in comps[used:-1]:
        cd = clean_dir(d)
        if rs == 'pixel-frog':
            cd = _num_prefix.sub('', cd).replace('Thowing', 'Throwing')  # publisher typo in a folder name
        lcd = cd.lower()
        if lcd in skip_dirs:
            return None, skip_dirs[lcd]
        if lcd in SKIP_DIRS:
            return None, SKIP_DIRS[lcd]
        folders.append(cd)
        if lcd in fmt_dirs:
            if not seen_fmt:
                preparts, seen_fmt = list(parts), True
            continue
        parts.append(slug(cd))
    if preparts is None:
        preparts = list(parts)
    if ext in SKIP_EXT:
        return None, SKIP_EXT[ext]
    if ext in EXTRA_SKIP_EXT:
        return None, EXTRA_SKIP_EXT[ext]
    if ext in IMG_EXT and (_preview_file.match(fname) or _doc_image.match(fname)):
        return None, 'preview/docs image (pack marketing or instructions)'
    if re.match(r'^licen[cs]e([_ ].*)?\.(txt|md)$', low):
        return None, 'licence text (copied to library per pack)'
    if ext in ('.txt', '.md'):
        return None, 'text/docs'
    stem = _stem(fname)
    if rs == 'quaternius' and stem == 'OBJ' and ext == '.obj':
        return None, 'stray export named OBJ.obj (same mesh as Suit_Male)'
    info = {'root': root, 'parts': parts, 'preparts': preparts, 'variant': None, 'folders': folders,
            'packTitle': pack_title, 'ext': ext, 'stem': stem, 'rel': rel,
            'sourcePath': rel_n.replace('.zip/', '.zip!/')}
    if rs == 'pixel-frog':
        stem = stem.replace('!!!', 'Exclamation').replace('Closiong', 'Closing').replace('Thowing', 'Throwing')
    m = _frame_size.search(stem)
    if m and ext in IMG_EXT:
        info['frameSize'] = [int(m.group(1)), int(m.group(2))]
        info['stem'] = stem[:m.start()].strip() or stem
    # 'Bob/glTF/Bob.gltf' (one folder per model): the model is quaternius/<pack>/bob, not .../bob/bob
    if parts and parts[-1] == slug(info['stem']):
        info['parts'] = parts[:-1]
        if preparts and preparts[-1] == parts[-1]:
            info['preparts'] = preparts[:-1]
    return info, None


def publisher_kind_2d(pack, info):
    """2D kind for quaternius / pixel-frog images."""
    fl = [x.lower() for x in info['folders']]
    words = set(_words(*info['folders'], info['stem']))
    if pack['rules'] == 'quaternius':
        if 'icons' in fl:
            return 'icon'
        if fl and fl[0] == 'png' and info['packTitle'].lower().startswith('ultimate fantasy rts'):
            return 'icon'  # 1024 px renders of each building/unit: portrait icons for an RTS UI
        return 'texture'  # Textures/, Blends/, palettes and atlases at the pack root
    if 'background' in fl:
        return 'background'
    if words & {'menu', 'buttons', 'button', 'levels', 'text', 'dialogue', 'live', 'bar'} or 'live and coins' in ' '.join(fl):
        return 'ui'
    return 'sprite'


# ---------------------------------------------------------------- kinds & styles

def _words(*strs):
    out = []
    for s in strs:
        out += [w for w in slug(s).split('-') if w]
    return out


TEXTURE_PACK_WORDS = ('prototype textures', 'pattern pack', 'retro textures', 'road textures', 'light masks',
                      'noise textures', 'patterns', 'textures')


def kind_2d(pack, info, is_svg=False):
    if pack.get('rules') in EXTRA_SKIP_DIRS:
        return publisher_kind_2d(pack, info)
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
    if pack.get('rules') == 'pixel-frog':
        return ['pixel-8bit', 'side-view'] if kind not in ('sfx', 'music', 'font') else ['retro']
    if pack.get('rules') == 'quaternius' and kind == 'model':
        return [pack.get('defaultStyle3d', 'low-poly')] + (['voxel'] if 'cube world' in p else [])
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

PUBLISHER_NOISE = {'ultimate', 'blends', 'blend', 'blender', 'exports', 'godot', 'unreal', 'unity', 'sprites',
                   'quaternius', 'standard', 'jpg', 'free'}


def tags_for(pack, info, extra=()):
    words = _words(info['packTitle'], *info['folders'], info['stem']) + list(extra)
    noise = NOISE_TAGS | PUBLISHER_NOISE if pack.get('rules') in EXTRA_SKIP_DIRS else NOISE_TAGS
    out = []
    for w in words:
        if w in noise or w.isdigit() or len(w) < 2:
            continue
        if re.fullmatch(r'\d+(px|x)?', w) or re.fullmatch(r'[a-z]\d+', w) and len(w) <= 2:
            continue
        if w not in out:
            out.append(w)
    return out[:24]
