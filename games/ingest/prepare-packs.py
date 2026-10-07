#!/usr/bin/env python3
"""Get the downloaded CC0 zips ready for the ingest pipeline.

  python3 prepare-packs.py [folder]      (default: games/packs, or NK_GAME_PACKS)

Put any mix of these in the folder, as downloaded:
  - Kenney: the "All-in-1" bundle and/or single packs from kenney.nl (kenney_<name>.zip)
  - KayKit: "The Complete KayKit Collection" and/or single packs (KayKit_<Name>_<version>_FREE.zip)
  - Quaternius: pack zips from quaternius.com (its Google Drive links give names like
    "Ultimate Stylized Nature - May 2022-20261007T022552Z-1-001.zip" or "Ships by @Quaternius-...zip")
  - Pixel Frog: "Pixel Adventure 1.zip", "Pixel Adventure 2.zip", "Kings and Pigs.zip",
    "Treasure Hunters.zip", "Pirate Bomb.zip" from pixelfrog-assets.itch.io

The result goes to <work>/packs/, which is what ingest.py reads (packs.json):
  - kenney.zip, kaykit.zip: laid out the way the bundles are. A bundle is linked, not copied. Single
    packs are combined into one zip under the folder names the bundles use, so asset ids match the
    bundles' ids (and the shipped AI tags) wherever the pack names match.
  - quaternius/, pixel-frog/: one link per pack, named after the pack (e.g. quaternius/Ships.zip). The
    names are the ones in packs.json, so ids and the shipped AI tags match; a pack packs.json doesn't
    list yet is ingested too, under its own name.

Only CC0 packs are taken. A zip whose licence file says something else (some publishers release newer
packs under licences that allow use in games but not sharing the files) is skipped, and so are zips
of other publishers. Re-run it after adding or removing zips; it only rebuilds what changed.
"""
import io
import json
import os
import re
import shutil
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
from common import GAMES, WORK, UNPACKED, read_json, write_json, slug, log  # noqa: E402
from rules import clean_pack_name  # noqa: E402

KENNEY_TOPS = {'2D assets', '3D assets', 'Audio', 'UI assets', 'Icons', 'Other', 'Early access', 'Archive', 'Goodies'}
TIERS = {'free', 'source', 'extra', 'basic', 'complete'}
# Pixel Frog packs that are CC0 (their itch.io pages say so; the zips have no licence file).
PIXEL_FROG_CC0 = ['Pixel Adventure 1', 'Pixel Adventure 2', 'Kings and Pigs', 'Treasure Hunters', 'Pirate Bomb']
ZIP_FAMILIES = ('kenney', 'kaykit')      # combined into <family>.zip
DIR_FAMILIES = ('quaternius', 'pixel-frog')  # one zip per pack in <family>/
CC0_RE = re.compile(r'\bCC0\b|publicdomain/zero|public domain dedication|creative\s+commons\s+zero', re.I)
NO_SHARING_RE = re.compile(r"redistribut|resell|can'?t\s+(?:be\s+)?(?:sold|shared)|not\s+(?:be\s+)?(?:sold|shared)", re.I)
DRIVE_STAMP = re.compile(r'-\d{8}T\d{6}Z(?:-\d+)*$')  # added by Google Drive to a downloaded folder


def known_folders():
    """{family: [folder names]} of the multi-zip packs in packs.json (the ids the shipped tags use)."""
    out = {f: [] for f in DIR_FAMILIES}
    for p in read_json(os.path.join(HERE, 'packs.json')) or []:
        if p.get('slug') in out and p.get('zips'):
            out[p['slug']] += list(p['zips'])
    for name in PIXEL_FROG_CC0:
        if name not in out['pixel-frog']:
            out['pixel-frog'].append(name)
    return out


KNOWN = known_folders()
KNOWN_KEY = {f: {slug(clean_pack_name(n)): n for n in names} for f, names in KNOWN.items()}


def entries(path):
    with zipfile.ZipFile(path) as z:
        return [i for i in z.infolist() if not i.is_dir()]


def licence_text(path):
    """Text of the zip's licence files (.txt, .md or .docx), '' when it has none."""
    out = []
    try:
        with zipfile.ZipFile(path) as z:
            for i in z.infolist():
                if i.filename.startswith('__MACOSX/') or not re.search(r'(^|/)licen[cs]e[^/]*\.(txt|md|docx)$', i.filename, re.I):
                    continue
                data = z.read(i)
                if i.filename.lower().endswith('.docx'):
                    try:
                        with zipfile.ZipFile(io.BytesIO(data)) as d:
                            data = re.sub(rb'<[^>]+>', b' ', d.read('word/document.xml'))
                    except (zipfile.BadZipFile, KeyError):
                        continue
                out.append(data.decode('utf-8', 'replace')[:20000])
    except zipfile.BadZipFile:
        return ''
    return '\n'.join(out)


def pack_stem(path):
    """'Ships by @Quaternius-20261007T024724Z-1-001.zip' -> 'Ships by @Quaternius'; 'Pirate Bomb (1).zip' -> 'Pirate Bomb'."""
    stem = os.path.splitext(os.path.basename(path))[0]
    stem = re.sub(r'\s*\(\d+\)$', '', stem)  # "pack (1).zip" from a second download
    return DRIVE_STAMP.sub('', stem).strip()


def known_name(family, path, tops):
    """The packs.json folder name for this zip, or None."""
    for cand in [pack_stem(path)] + sorted(tops):
        hit = KNOWN_KEY[family].get(slug(clean_pack_name(cand)))
        if hit:
            return hit
    return None


def not_cc0(lic):
    why = 'its licence forbids sharing the asset files' if NO_SHARING_RE.search(lic) else 'its licence file does not say CC0'
    return '%s (games may still be able to use it, but this library only takes CC0 packs)' % why


def classify(path):
    """((family, kind, folder), None) or (None, reason). kind: 'bundle' | 'single' | 'pack'."""
    name = os.path.basename(path)
    try:
        ents = entries(path)
    except zipfile.BadZipFile:
        return None, 'not a zip file'
    tops = {e.filename.split('/', 1)[0] for e in ents if '/' in e.filename and not e.filename.startswith('__MACOSX/')}
    lic = licence_text(path)
    low_lic = lic.lower()
    if any(t.startswith('The Complete KayKit') for t in tops):
        return ('kaykit', 'bundle', None), None
    if len(tops & KENNEY_TOPS) >= 2:
        return ('kenney', 'bundle', None), None
    low = name.lower()
    family = None
    if low.startswith('kenney') or 'kenney' in low_lic:
        family = 'kenney'
    elif 'kaykit' in low or 'kaykit' in low_lic or 'kay lousberg' in low_lic:
        family = 'kaykit'
    if family:
        if lic and not CC0_RE.search(lic):
            return None, not_cc0(lic)
        return (family, 'single', None), None
    # Pixel Frog: no licence file in the zips; known CC0 packs by name.
    pf = known_name('pixel-frog', path, set())
    if pf:
        if lic and not CC0_RE.search(lic):
            return None, not_cc0(lic)
        return ('pixel-frog', 'pack', pf), None
    q_known = known_name('quaternius', path, tops)
    if q_known or 'quaternius' in low or any('quaternius' in t.lower() for t in tops) or 'quaternius' in low_lic:
        if lic and not CC0_RE.search(lic):
            return None, 'Quaternius pack, but ' + not_cc0(lic)
        if not lic and not q_known:
            return None, ('Quaternius pack with no licence file that packs.json does not list as CC0; check its page '
                          'on quaternius.com, and if it says CC0 add a licence.txt saying so to the zip')
        return ('quaternius', 'pack', q_known or clean_pack_name(pack_stem(path))), None
    return None, 'not a Kenney, KayKit, Quaternius or Pixel Frog CC0 pack'


def _words(stem):
    return [w for w in re.split(r'[\s_]+', stem) if w]


def folder_for(family, path):
    """The folder a single pack gets inside the combined zip (the bundle's name for it)."""
    stem = os.path.splitext(os.path.basename(path))[0]
    stem = re.sub(r'\s*\(\d+\)$', '', stem)  # "pack (1).zip" from a second download
    if family == 'kenney':
        stem = re.sub(r'^kenney[\s_-]*', '', stem, flags=re.I)
        stem = re.sub(r'[\s_-]*v?\d+(\.\d+)*$', '', stem)
        return 'Packs/%s/' % (stem.replace('_', '-') or 'pack')
    words = [w for w in _words(stem) if w.lower() not in TIERS]
    if words and words[0].lower() == 'kaykit':
        words = words[1:]
    return 'KayKit %s/' % ' '.join(words or ['Pack'])


def add_single(out, path, folder):
    with zipfile.ZipFile(path) as z:
        ents = [i for i in z.infolist() if not i.is_dir() and not i.filename.startswith('__MACOSX/')]
        tops = {e.filename.split('/', 1)[0] for e in ents}
        strip = ''
        if len(tops) == 1 and all('/' in e.filename for e in ents):
            strip = next(iter(tops)) + '/'
        for info in ents:
            rel = info.filename[len(strip):]
            if not rel:
                continue
            zi = zipfile.ZipInfo(folder + rel, date_time=info.date_time)
            with z.open(info) as src, out.open(zi, 'w', force_zip64=True) as dst:
                shutil.copyfileobj(src, dst, 1 << 20)
    return len(ents)


def build_zip_family(dest, family, got):
    """kenney / kaykit: <family>.zip (the bundle linked, or the single packs combined). True when ready."""
    out = os.path.join(dest, family + '.zip')
    manifest = os.path.join(dest, '.%s.json' % family)
    if got['bundle']:
        bundle = got['bundle'][-1]
        if len(got['bundle']) > 1 or got['single']:
            log('%s: using the bundle %s; the other %s zips are ignored' % (family, os.path.basename(bundle), family))
        want = {'bundle': bundle, 'size': os.path.getsize(bundle)}
    elif got['single']:
        want = {'single': [[os.path.basename(p), os.path.getsize(p)] for p in got['single']]}
    else:
        for f in (out, manifest):
            if os.path.lexists(f):
                os.remove(f)
        return False
    if read_json(manifest) == want and os.path.exists(out):
        log('%s: up to date' % family)
        return True
    if os.path.lexists(out):
        os.remove(out)
    # The pack's unpacked tree is stale now; ingest unpacks the new zip.
    shutil.rmtree(os.path.join(UNPACKED, family), ignore_errors=True)
    if 'bundle' in want:
        os.symlink(want['bundle'], out)
        log('%s: bundle %s' % (family, os.path.basename(want['bundle'])))
    else:
        part = out + '.partial'
        n = 0
        with zipfile.ZipFile(part, 'w', zipfile.ZIP_STORED, allowZip64=True) as z:
            for p in got['single']:
                folder = folder_for(family, p)
                n += add_single(z, p, folder)
                log('  %s -> %s' % (os.path.basename(p), folder.rstrip('/')))
        os.replace(part, out)
        log('%s: %d packs, %d files combined' % (family, len(got['single']), n))
    write_json(manifest, want)
    return True


def build_dir_family(dest, family, got):
    """quaternius / pixel-frog: <family>/<pack>.zip, one link per pack. ingest.py extracts each zip into
    its own folder (only the ones that changed). True when ready."""
    out = os.path.join(dest, family)
    old = {}
    if os.path.isdir(out):
        old = {n: (os.readlink(os.path.join(out, n)) if os.path.islink(os.path.join(out, n)) else None)
               for n in os.listdir(out) if n.endswith('.zip')}
    elif os.path.lexists(out):
        os.remove(out)
    want = {'%s.zip' % folder: path for folder, path in got.items()}
    removed = 0
    for n, target in old.items():
        if n not in want:
            os.remove(os.path.join(out, n))
            log('  %s/%s: no longer in the pack folder, removed' % (family, n[:-4]))
            removed += 1
    if not want:
        if os.path.isdir(out):
            shutil.rmtree(out)
        return False
    os.makedirs(out, exist_ok=True)
    added = 0
    for n, path in sorted(want.items()):
        link = os.path.join(out, n)
        if old.get(n) == path and os.path.exists(link):
            continue
        if os.path.lexists(link):
            os.remove(link)
        os.symlink(path, link)
        log('  %s -> %s/%s' % (os.path.basename(path), family, n[:-4]))
        added += 1
    changes = ', '.join(x for x in ('%d new or changed' % added if added else '',
                                    '%d removed' % removed if removed else '') if x)
    log('%s: %d packs%s' % (family, len(want), ' (%s)' % changes if changes else ', up to date'))
    return True


def main():
    src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else
                          (os.environ.get('NK_GAME_PACKS') or os.path.join(GAMES, 'packs')))
    dest = os.path.join(WORK, 'packs')
    os.makedirs(dest, exist_ok=True)
    if not os.path.isdir(src):
        sys.exit('No pack folder at %s. Make it, put the downloaded zips in it, and run this again.' % src)
    found = {f: {'bundle': [], 'single': []} for f in ZIP_FAMILIES}
    found.update({f: {} for f in DIR_FAMILIES})
    for name in sorted(os.listdir(src)):
        path = os.path.join(src, name)
        if not name.lower().endswith('.zip') or not os.path.isfile(path):
            continue
        kind, reason = classify(path)
        if kind is None:
            log('skipped %s: %s' % (name, reason))
            continue
        family, how, folder = kind
        if family in DIR_FAMILIES:
            if folder in found[family]:
                log('%s: two zips for %s; using %s, not %s'
                    % (family, folder, name, os.path.basename(found[family][folder])))
            found[family][folder] = path
        else:
            found[family][how].append(path)
    ready = []
    for family in ZIP_FAMILIES:
        if build_zip_family(dest, family, found[family]):
            ready.append(family)
    for family in DIR_FAMILIES:
        if build_dir_family(dest, family, found[family]):
            ready.append(family)
    if not ready:
        sys.exit('No CC0 Kenney, KayKit, Quaternius or Pixel Frog zips found in %s. See docs/games.md for where to get them.' % src)
    print(json.dumps({'ready': ready, 'folder': dest}))


if __name__ == '__main__':
    main()
