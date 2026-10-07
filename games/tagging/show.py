#!/usr/bin/env python3
"""Print a tagged sheet compactly for review: python3 show.py s01234 [--full]"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import TAGS_DIR, load_sheets
name = sys.argv[1].replace(".webp", "")
full = "--full" in sys.argv
sh = {s["file"]: s for s in load_sheets()["sheets"]}[name + ".webp"]
d = json.load(open(os.path.join(TAGS_DIR, "sheets", name + ".json")))
for it in sh["items"]:
    r = d["items"].get(it["id"])
    if not r:
        print(it["n"], it["id"], "MISSING"); continue
    k = r["kind"] + ("(was %s)" % it["kind"] if r["kind"] != it["kind"] else "")
    line = f"{it['n']:>2} {it['id'].rsplit('/',1)[1][:28]:<28} | {r['name']} | {k} {r.get('style')} {r.get('view')} | {','.join(r['roles'])}"
    if full:
        line += f"\n     {r['desc']}\n     tags: {' '.join(r['tags'])}\n     use: {r['use']}"
    print(line)
