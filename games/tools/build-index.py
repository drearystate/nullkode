#!/usr/bin/env python3
"""Build the asset search index: game-assets/_index/assets.db (SQLite + FTS5).

  nice -n 10 python3 build-index.py

Inputs: catalog.jsonl, tags.jsonl (AI tags; rules fallback for untagged), _cards/cards.json.
Readers: nk-games/tools/asset-search.mjs (better-sqlite3) - the Next.js server can open the same file read-only.
The file is written to a temp path and swapped in atomically.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tagging"))
from common import LIB, TAGS_FILE, CARDS_DIR, INDEX_DIR, load_catalog, set_of, facts, pivot_of  # noqa: E402

STYLE_MAP = {"hd": "cartoon-hd", "vector": "flat-vector", "pixel-8bit": "pixel-8bit", "pixel-1bit": "pixel-1bit",
             "low-poly": "low-poly", "hand-drawn": "hand-drawn", "voxel": "voxel"}
VIEW_MAP = {"isometric": "isometric", "side-view": "side", "top-down": "top-down"}
FAMILY = {"pixel-1bit": "pixel", "pixel-8bit": "pixel", "pixel-16bit": "pixel",
          "flat-vector": "smooth-2d", "cartoon-hd": "smooth-2d", "hand-drawn": "drawn-2d", "sketch": "drawn-2d",
          "painterly": "drawn-2d", "realistic": "realistic", "low-poly": "low-poly-3d", "voxel": "voxel-3d",
          "stylised-3d": "low-poly-3d"}  # KayKit-style textured low-poly and flat low-poly sit together
def family_of(style, dim):
    """Style family used for coherence checks. 2D sprites rendered from 3D models (low-poly/stylised look) sit with
    smooth 2D art; 3D models never share a family with 2D art."""
    if dim == "2d" and style in ("low-poly", "stylised-3d", "voxel"):
        return "smooth-2d"
    if dim == "3d" and style not in ("low-poly", "stylised-3d", "voxel", "realistic"):
        return "low-poly-3d"
    return FAMILY.get(style or "", None)


DIM = {"model": "3d", "sfx": "audio", "music": "audio", "font": "font"}
STYLE_WORDS = {"pixel-1bit": "pixel 1bit 1-bit monochrome retro", "pixel-8bit": "pixel pixelart 8bit 8-bit retro",
               "pixel-16bit": "pixel pixelart 16bit 16-bit retro", "flat-vector": "vector flat clean",
               "cartoon-hd": "cartoon hd", "hand-drawn": "handdrawn hand-drawn drawn", "sketch": "sketch pencil",
               "painterly": "painted", "realistic": "realistic", "low-poly": "lowpoly low-poly 3d",
               "stylised-3d": "stylised stylized 3d", "voxel": "voxel 3d blocky"}


def words(s: str) -> str:
    return " ".join(w for w in re.split(r"[^a-z0-9]+", s.lower()) if w and not w.isdigit())


def load_tags():
    out = {}
    if os.path.exists(TAGS_FILE):
        for line in open(TAGS_FILE, encoding="utf-8"):
            r = json.loads(line)
            out[r["id"]] = r
    return out


def main():
    t0 = time.time()
    cat = load_catalog()
    tags = load_tags()
    cards = json.load(open(os.path.join(CARDS_DIR, "cards.json"))) if os.path.exists(os.path.join(CARDS_DIR, "cards.json")) else []
    card_by = {c["set"]: c for c in cards}
    os.makedirs(INDEX_DIR, exist_ok=True)
    tmp = os.path.join(INDEX_DIR, "assets.db.tmp")
    if os.path.exists(tmp):
        os.remove(tmp)
    db = sqlite3.connect(tmp)
    db.executescript("""
    PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
    CREATE TABLE assets (
      rid INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL, pack TEXT, set_id TEXT, category TEXT, kind TEXT,
      name TEXT, desc TEXT, style TEXT, family TEXT, view TEXT, roles TEXT, tags TEXT, use TEXT,
      licence TEXT, redistributable INTEGER, dim TEXT, animated INTEGER, rigged INTEGER, clips INTEGER,
      clip_names TEXT, frames INTEGER, tile INTEGER, w INTEGER, h INTEGER, tris INTEGER, size_m TEXT,
      height_m REAL, footprint_m REAL, pivot TEXT, duration REAL, url TEXT, preview TEXT, facts TEXT,
      source TEXT, alt_of TEXT, alts INTEGER DEFAULT 0, variant TEXT, rig TEXT, in_atlas TEXT, frame_names TEXT,
      pairs TEXT);
    CREATE VIRTUAL TABLE assets_fts USING fts5(name, tags, desc, words, use, tokenize='porter unicode61');
    CREATE TABLE sets (set_id TEXT PRIMARY KEY, title TEXT, pack TEXT, assets INTEGER, kinds TEXT, style TEXT,
      view TEXT, engine TEXT, licence TEXT, redistributable INTEGER, summary TEXT, card TEXT);
    CREATE VIRTUAL TABLE sets_fts USING fts5(set_id, title, summary, words, tokenize='porter unicode61');
    CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT);
    """)
    # exact duplicates: vector-only twin of a raster sprite in the same set with the same leaf name + kind
    raster_by_key = {}
    for a in cat.values():
        if not (a.get("metrics") or {}).get("vector") or a["files"]["primary"].endswith(".png"):
            raster_by_key.setdefault((set_of(a["id"]), a["kind"], a["id"].rsplit("/", 1)[1]), a["id"])
    alts = {}
    rows = []
    # rigs (KayKit: node "Rig_Medium"/"Rig_Large"); animation packs per rig
    rig_of = {}
    for i, a in cat.items():
        m = a.get("metrics") or {}
        if a["kind"] == "model" and (m.get("rigged") or m.get("clips")):
            r = next((n for n in (m.get("nodeNames") or []) if re.match(r"^Rig_[A-Za-z]+$", n)), None)
            if r:
                rig_of[i] = r.lower().replace("_", "-")
    clip_packs = {}
    for i, r in rig_of.items():
        if cat[i]["metrics"].get("clips"):
            clip_packs.setdefault((cat[i]["pack"], r), []).append(i)
    # atlas frames: sprite leaf name -> atlas id + frame (same set)
    atlas_frame = {}
    for i, a in cat.items():
        fn = (a.get("metrics") or {}).get("frameNames")
        if a["kind"] in ("spritesheet", "tileset") and fn and (a.get("metrics") or {}).get("atlasFormat"):
            for f in fn:
                key = (set_of(i), re.sub(r"[^a-z0-9]+", "-", re.sub(r"\.(png|jpg)$", "", f.lower())).strip("-"))
                atlas_frame.setdefault(key, (i, f))
    n_ai = 0
    for rid, (i, a) in enumerate(sorted(cat.items()), 1):
        m = a.get("metrics") or {}
        t = tags.get(i) or {}
        if t.get("source") == "ai":
            n_ai += 1
        kind = t.get("kind") or a["kind"]
        style = t.get("style") if t.get("style") not in (None, "n/a") else None
        if not style:
            style = next((STYLE_MAP[s] for s in a.get("style", []) if s in STYLE_MAP), None)
            if a["kind"] == "model" and not style:
                style = "low-poly"
        view = t.get("view") if t.get("view") not in (None, "n/a") else None
        if not view:
            view = "3d" if a["kind"] == "model" else next((VIEW_MAP[s] for s in a.get("style", []) if s in VIEW_MAP), None)
        dim = DIM.get(a["kind"], "2d")
        clips = m.get("clips") or []
        clip_names = [c.get("name") if isinstance(c, dict) else str(c) for c in clips]
        frames = None
        if a["kind"] == "animation":
            frames = m.get("frames")
        elif a["kind"] == "spritesheet":
            frames = m["frames"] if isinstance(m.get("frames"), int) else (m.get("grid") or {}).get("frames")
        animated = 1 if (a["kind"] == "animation" or clip_names or (a["kind"] == "spritesheet" and (frames or 0) > 1)) else 0
        tile = None
        if a["kind"] == "tileset":
            tile = m.get("tileWidth")
        elif dim == "2d" and m.get("width") and m.get("width") == m.get("height") and m["width"] <= 128 and \
                ("tile" in i or "tile" in (t.get("roles") or []) or "tile" in " ".join(t.get("tags", []))):
            tile = m["width"]
        size = (m.get("bbox") or {}).get("size")
        alt_of = None
        if m.get("vector") and not a["files"]["primary"].endswith(".png"):
            k = (set_of(i), a["kind"], i.rsplit("/", 1)[1])
            if raster_by_key.get(k) and raster_by_key[k] != i:
                alt_of = raster_by_key[k]
                alts[alt_of] = alts.get(alt_of, 0) + 1
        leaf = i.rsplit("/", 1)[1]
        variant = re.sub(r"(^|-)(red|blue|green|yellow|orange|purple|pink|white|black|grey|gray|brown|beige|"
                         r"dark|light|[a-f]|\d+)(?=-|$)", "", leaf).strip("-")
        variant = f"{a['category']}/{variant}"
        rig = rig_of.get(i)
        pairs = None
        if rig and not clip_names:
            packs = sorted(clip_packs.get((a["pack"], rig), []), key=lambda x: (0 if "/character-animations/" in x else 1 if "/skeletons/" in x else 2, x))[:8]
            if packs:
                groups = {}
                for x in packs:
                    d, leaf = x.rsplit("/", 1)
                    groups.setdefault(d, []).append(leaf)
                parts = []
                for d, leaves in groups.items():
                    pre = os.path.commonprefix(leaves)
                    pre = pre[:pre.rfind("-") + 1] if "-" in pre else ""
                    parts.append(f"{d}/{pre}{{{','.join(l[len(pre):] for l in leaves)}}}" if len(leaves) > 1 else f"{d}/{leaves[0]}")
                pairs = "clips: " + " + ".join(parts)
        in_atlas = None
        if a["kind"] in ("sprite", "ui", "icon", "background", "texture"):
            hit = atlas_frame.get((set_of(i), leaf))
            if hit:
                in_atlas = f"{hit[0]}#{hit[1]}"
        fnames = m.get("frameNames") if a["kind"] in ("spritesheet", "tileset", "animation") else None
        all_tags = list(dict.fromkeys((t.get("tags") or []) + (t.get("roles") or [])))
        w_words = " ".join([words(a["category"]), words(leaf), a["kind"], STYLE_WORDS.get(style or "", ""),
                            (view or "").replace("-", " "), dim, " ".join(a.get("tags", [])),
                            "animated" if animated else "", "rigged" if m.get("rigged") else "", rig or "",
                            words(" ".join(clip_names[:30])), words((card_by.get(set_of(i)) or {}).get("title", ""))])
        url = "/game-assets/" + a["files"]["primary"]
        rows.append((rid, i, a["pack"], set_of(i), a["category"], kind, t.get("name") or a["name"], t.get("desc", ""),
                     style, family_of(style, dim), view, ",".join(t.get("roles") or []),
                     ",".join(all_tags), t.get("use", ""), a["licence"], 1 if a.get("redistributable", True) else 0,
                     dim, animated, 1 if m.get("rigged") else 0, len(clip_names), ",".join(clip_names[:60]),
                     frames, tile, m.get("width") or m.get("frameWidth"), m.get("height") or m.get("frameHeight"),
                     m.get("triangles"), "x".join(f"{v:.2f}".rstrip("0").rstrip(".") for v in size) if size else None,
                     size[1] if size else None, max(size[0], size[2]) if size else None, pivot_of(m) if size else None,
                     m.get("duration"), url, "/game-assets/" + a["preview"], facts(a), t.get("source", "none"),
                     alt_of, 0, variant, rig, in_atlas, ",".join(fnames) if fnames else None, pairs))
        db.execute("INSERT INTO assets_fts(rowid, name, tags, desc, words, use) VALUES (?,?,?,?,?,?)",
                   (rid, (t.get("name") or a["name"]), " ".join(x.replace("-", " ") + " " + x for x in all_tags),
                    t.get("desc", ""), w_words, t.get("use", "")))
    db.executemany("INSERT INTO assets VALUES (" + ",".join("?" * 42) + ")", rows)
    for k, v in alts.items():
        db.execute("UPDATE assets SET alts=? WHERE id=?", (v, k))
    db.executescript("""
      CREATE INDEX ix_set ON assets(set_id); CREATE INDEX ix_cat ON assets(category); CREATE INDEX ix_kind ON assets(kind);
      CREATE INDEX ix_variant ON assets(variant);
    """)
    for c in cards:
        db.execute("INSERT INTO sets VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                   (c["set"], c["title"], c["pack"], c["assets"], json.dumps(c["kinds"]), c["style"], c["view"],
                    c["engine"], c["licence"], 1 if c["redistributable"] else 0, c["summary"], c["card"]))
        db.execute("INSERT INTO sets_fts(rowid, set_id, title, summary, words) VALUES "
                   "((SELECT rowid FROM sets WHERE set_id=?),?,?,?,?)",
                   (c["set"], words(c["set"]), c["title"], c["summary"],
                    " ".join([STYLE_WORDS.get(c["style"] or "", ""), c["view"] or "", c["engine"], " ".join(c["kinds"])])))
    db.execute("INSERT INTO meta VALUES ('built', ?)", (time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),))
    db.execute("INSERT INTO meta VALUES ('assets', ?)", (str(len(rows)),))
    db.execute("INSERT INTO meta VALUES ('aiTagged', ?)", (str(n_ai),))
    db.execute("INSERT INTO assets_fts(assets_fts) VALUES('optimize')")
    db.commit()
    db.execute("VACUUM")
    db.close()
    os.replace(tmp, os.path.join(INDEX_DIR, "assets.db"))
    print(f"index: {len(rows)} assets ({n_ai} AI-tagged), {len(cards)} set cards, {sum(alts.values())} vector twins "
          f"hidden -> {INDEX_DIR}/assets.db ({os.path.getsize(os.path.join(INDEX_DIR, 'assets.db')) / 1e6:.1f} MB) "
          f"in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
