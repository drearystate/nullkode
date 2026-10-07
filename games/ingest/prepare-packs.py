#!/usr/bin/env python3
"""Get the downloaded Kenney and KayKit zips ready for the ingest pipeline.

  python3 prepare-packs.py [folder]      (default: games/packs, or NK_GAME_PACKS)

Put any mix of these in the folder:
  - the Kenney "All-in-1" bundle and/or single Kenney packs from kenney.nl (kenney_<name>.zip)
  - "The Complete KayKit Collection" and/or single KayKit packs (KayKit_<Name>_<version>_FREE.zip)

The result is one zip per pack family in <work>/packs/ (kenney.zip, kaykit.zip), laid out the way
the bundles are, which is what ingest.py reads (packs.json). A bundle is linked, not copied. Single
packs are combined into one zip under the folder names the bundles use, so asset ids match the
bundles' ids (and the shipped AI tags) wherever the pack names match. Zips of other publishers
are skipped. Re-run it after adding or removing zips; it only rebuilds what changed.
"""
import json
import os
import re
import shutil
import sys
import zipfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from common import GAMES, WORK, UNPACKED, read_json, write_json, log  # noqa: E402

KENNEY_TOPS = {'2D assets', '3D assets', 'Audio', 'UI assets', 'Icons', 'Other', 'Early access', 'Archive', 'Goodies'}
TIERS = {'free', 'source', 'extra', 'basic', 'complete'}


def entries(path):
    with zipfile.ZipFile(path) as z:
        return [i for i in z.infolist() if not i.is_dir()]


def licence_text(path):
    try:
        with zipfile.ZipFile(path) as z:
            for i in z.infolist():
                if re.search(r'(^|/)licen[cs]e[^/]*\.txt$', i.filename, re.I):
                    return z.read(i).decode('utf-8', 'replace')[:4000]
    except zipfile.BadZipFile:
        return ''
    return ''


def classify(path):
    """('kenney'|'kaykit', 'bundle'|'single') or (None, reason)."""
    name = os.path.basename(path)
    try:
        ents = entries(path)
    except zipfile.BadZipFile:
        return None, 'not a zip file'
    tops = {e.filename.split('/', 1)[0] for e in ents if '/' in e.filename}
    if any(t.startswith('The Complete KayKit') for t in tops):
        return ('kaykit', 'bundle'), None
    if len(tops & KENNEY_TOPS) >= 2:
        return ('kenney', 'bundle'), None
    low = name.lower()
    if low.startswith('kenney'):
        return ('kenney', 'single'), None
    if 'kaykit' in low:
        return ('kaykit', 'single'), None
    lic = licence_text(path).lower()
    if 'kenney' in lic:
        return ('kenney', 'single'), None
    if 'kaykit' in lic or 'kay lousberg' in lic:
        return ('kaykit', 'single'), None
    return None, 'not a Kenney or KayKit pack'


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


def main():
    src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else
                          (os.environ.get('NK_GAME_PACKS') or os.path.join(GAMES, 'packs')))
    dest = os.path.join(WORK, 'packs')
    os.makedirs(dest, exist_ok=True)
    if not os.path.isdir(src):
        sys.exit('No pack folder at %s. Make it, put the downloaded zips in it, and run this again.' % src)
    found = {'kenney': {'bundle': [], 'single': []}, 'kaykit': {'bundle': [], 'single': []}}
    for name in sorted(os.listdir(src)):
        path = os.path.join(src, name)
        if not name.lower().endswith('.zip') or not os.path.isfile(path):
            continue
        kind, reason = classify(path)
        if kind is None:
            log('skipped %s: %s' % (name, reason))
            continue
        found[kind[0]][kind[1]].append(path)
    ready = []
    for family, got in found.items():
        out = os.path.join(dest, family + '.zip')
        manifest = os.path.join(dest, '.%s.json' % family)
        if got['bundle']:
            bundle = got['bundle'][-1]
            if len(got['bundle']) > 1 or got['single']:
                log('%s: using the bundle %s; the other %s zips are ignored'
                    % (family, os.path.basename(bundle), family))
            want = {'bundle': bundle, 'size': os.path.getsize(bundle)}
        elif got['single']:
            want = {'single': [[os.path.basename(p), os.path.getsize(p)] for p in got['single']]}
        else:
            for f in (out, manifest):
                if os.path.lexists(f):
                    os.remove(f)
            continue
        if read_json(manifest) == want and os.path.exists(out):
            log('%s: up to date' % family)
            ready.append(family)
            continue
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
        ready.append(family)
    if not ready:
        sys.exit('No Kenney or KayKit zips found in %s. See docs/games.md for where to get them.' % src)
    print(json.dumps({'ready': ready, 'folder': dest}))


if __name__ == '__main__':
    main()
