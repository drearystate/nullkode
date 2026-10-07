#!/usr/bin/env python3
"""NullKode game-asset ingest pipeline.

Stages (each idempotent, re-run safe):
  unpack   unzip the packs listed in packs.json into work/unpacked/ (nested zips too)
  scan     classify every file -> work/plan.jsonl (+ work/state/skipped.jsonl)
  process  build library files, metrics and previews for new/changed assets
  catalog  write game-assets/catalog.jsonl, packs.json, README.md, LICENSE files
  sheets   contact sheets (6x5) for the tagging pass -> work/sheets/
  verify   sample-load GLBs (three.js), sprites, audio
  report   nk-games/ingest/REPORT.md
  all      everything above in order

Usage: nice -n 10 python3 ingest.py all [--pack kenney] [--only-kind model] [--limit N]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from common import load_packs, log, nice_self  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('stage', choices=['unpack', 'scan', 'process', 'catalog', 'sheets', 'verify', 'report', 'all'])
    ap.add_argument('--pack', action='append', help='limit to pack slug(s)')
    ap.add_argument('--only-kind', action='append', help='process: limit to kind(s) or proc(s)')
    ap.add_argument('--limit', type=int, default=0, help='process: at most N pending assets (testing)')
    ap.add_argument('--prune', action='store_true', help='catalog: delete library files no longer in the plan')
    args = ap.parse_args()
    nice_self()
    packs = load_packs()
    if args.pack:
        packs = [p for p in packs if p['slug'] in args.pack]
    stages = ['unpack', 'scan', 'process', 'catalog', 'sheets', 'verify', 'report'] if args.stage == 'all' else [args.stage]
    for st in stages:
        log('=== stage %s' % st)
        if st == 'unpack':
            import scan
            scan.unpack(packs)
        elif st == 'scan':
            import scan
            scan.scan(load_packs())  # always scan all packs so ids stay globally unique
        elif st == 'process':
            import process
            process.run(packs, kinds=args.only_kind, limit=args.limit)
        elif st == 'catalog':
            import catalog
            catalog.build(load_packs(), prune=args.prune)
        elif st == 'sheets':
            import catalog
            catalog.sheets()
        elif st == 'verify':
            import verify
            if args.pack:
                verify.run(n_glb=args.limit or 30, n_img=args.limit or 30, packs=set(args.pack))
            else:
                verify.run()
        elif st == 'report':
            import report
            report.write(load_packs())


if __name__ == '__main__':
    main()
