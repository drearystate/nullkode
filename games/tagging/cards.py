#!/usr/bin/env python3
"""Pack/category cards: one short Markdown card per set (<pack>/<set>, e.g. kenney/nature-kit) so the AI picks
coherent sets instead of mixing styles.

  nice -n 10 python3 cards.py build [--only kenney/nature-kit,...] [--redo] [--concurrency 4]
  python3 cards.py index            # game-assets/_cards/INDEX.md + cards.json

Each card = a deterministic header (licence, counts, style/view mix, scale/units/pivots, tile sizes, animation)
written from the catalog + tags, and an AI-written body from those facts + a contact image of up to 30
representative previews. Output: game-assets/_cards/<pack>/<set>.md
"""
from __future__ import annotations

import argparse
import collections
import io
import json
import os
import re
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CARDS_DIR, LIB, TAGS_FILE, WORK, load_catalog, set_of, pivot_of, facts
import runner
from tag import Quota, log, append_jsonl, CALLS, FAILURES

CARD_VERSION = 3
STYLE_MAP = {"hd": "cartoon-hd", "vector": "flat-vector", "pixel-8bit": "pixel-8bit", "pixel-1bit": "pixel-1bit",
             "low-poly": "low-poly", "hand-drawn": "hand-drawn", "voxel": "voxel"}
VIEW_MAP = {"isometric": "isometric", "side-view": "side", "top-down": "top-down"}


def load_tags() -> dict:
    out = {}
    if os.path.exists(TAGS_FILE):
        for line in open(TAGS_FILE, encoding="utf-8"):
            r = json.loads(line)
            out[r["id"]] = r
    return out


def eff_style(a, t):
    if t and t.get("style") and t["style"] != "n/a":
        return t["style"]
    for s in a.get("style", []):
        if s in STYLE_MAP:
            return STYLE_MAP[s]
    return None


def eff_view(a, t):
    if t and t.get("view") and t["view"] != "n/a":
        return t["view"]
    if a["kind"] == "model":
        return "3d"
    for s in a.get("style", []):
        if s in VIEW_MAP:
            return VIEW_MAP[s]
    return None


def pct(counter: collections.Counter, n=4):
    tot = sum(counter.values()) or 1
    return ", ".join(f"{k} {v * 100 // tot}%" for k, v in counter.most_common(n) if k)


def set_stats(assets: list[dict], tags: dict) -> dict:
    kinds = collections.Counter(a["kind"] for a in assets)
    styles = collections.Counter(eff_style(a, tags.get(a["id"])) for a in assets)
    views = collections.Counter(eff_view(a, tags.get(a["id"])) for a in assets)
    subs = collections.Counter("/".join(a["category"].split("/")[2:]) or "(root)" for a in assets)
    lic = assets[0]["licence"]
    st = {"n": len(assets), "kinds": kinds, "styles": styles, "views": views, "subs": subs, "licence": lic,
          "redistributable": assets[0].get("redistributable", True)}
    models = [a for a in assets if a["kind"] == "model"]
    if models:
        hs = [a["metrics"]["bbox"]["size"][1] for a in models if a["metrics"].get("bbox")]
        ws = [max(a["metrics"]["bbox"]["size"][0], a["metrics"]["bbox"]["size"][2]) for a in models if a["metrics"].get("bbox")]
        tris = [a["metrics"].get("triangles", 0) for a in models]
        piv = collections.Counter(pivot_of(a["metrics"]) for a in models)
        # common footprint (grid) sizes
        fp = collections.Counter(round(max(a["metrics"]["bbox"]["size"][0], a["metrics"]["bbox"]["size"][2]), 1)
                                 for a in models if a["metrics"].get("bbox"))
        st["models"] = {
            "count": len(models), "heightMedian": round(statistics.median(hs), 2) if hs else None,
            "footprintMedian": round(statistics.median(ws), 2) if ws else None,
            "heightRange": [round(min(hs), 2), round(max(hs), 2)] if hs else None,
            "trisMedian": int(statistics.median(tris)) if tris else 0, "trisMax": max(tris) if tris else 0,
            "pivots": piv, "footprints": fp.most_common(4),
            "rigged": sum(1 for a in models if a["metrics"].get("rigged")),
            "withClips": sum(1 for a in models if a["metrics"].get("clips")),
            "clipNames": sorted({(c.get("name") if isinstance(c, dict) else str(c)) for a in models
                                 for c in (a["metrics"].get("clips") or [])})[:40],
            "textured": sum(1 for a in models if a["metrics"].get("textures")),
        }
    sprites = [a for a in assets if a["kind"] in ("sprite", "icon", "ui", "background", "texture")]
    if sprites:
        sz = collections.Counter(f"{a['metrics'].get('width')}x{a['metrics'].get('height')}" for a in sprites)
        st["sprites"] = {"count": len(sprites), "sizes": sz.most_common(5),
                         "vector": sum(1 for a in sprites if a["metrics"].get("vector"))}
    ts = [a for a in assets if a["kind"] == "tileset"]
    if ts:
        st["tilesets"] = [(a["id"], a["metrics"].get("tileWidth"), a["metrics"].get("tileHeight"),
                           a["metrics"].get("tileCount"), a["metrics"].get("spacing")) for a in ts][:8]
    sh = [a for a in assets if a["kind"] == "spritesheet"]
    if sh:
        st["spritesheets"] = [(a["id"], a["metrics"].get("frames") if isinstance(a["metrics"].get("frames"), int)
                               else None, (a["metrics"].get("grid") or {}).get("frameWidth")) for a in sh][:8]
    an = [a for a in assets if a["kind"] == "animation"]
    if an:
        st["animations"] = {"count": len(an), "frames": collections.Counter(a["metrics"].get("frames") for a in an).most_common(4),
                            "frameSizes": collections.Counter(f"{a['metrics'].get('frameWidth')}x{a['metrics'].get('frameHeight')}" for a in an).most_common(3)}
    au = [a for a in assets if a["kind"] in ("sfx", "music")]
    if au:
        d = [a["metrics"].get("duration", 0) for a in au]
        st["audio"] = {"count": len(au), "durMedian": round(statistics.median(d), 2), "durMax": round(max(d), 1)}
    return st


def engine_for(st) -> str:
    k = st["kinds"]
    if k.get("model", 0) >= max(1, st["n"] // 2):
        return "three-3d"
    if k.get("sfx", 0) + k.get("music", 0) >= st["n"] // 2:
        return "either (audio)"
    if k.get("font", 0) == st["n"]:
        return "either (font)"
    if k.get("texture", 0) >= st["n"] // 2 and not k.get("sprite"):
        return "either (textures: three-3d materials or phaser-2d backgrounds)"
    return "phaser-2d"


CHAR_REF: dict = {}


def char_refs(cat) -> dict:
    """pack -> 'rig-medium characters ~2.4 m tall, rig-large ~4 m' (median of rigged character models)."""
    by = collections.defaultdict(lambda: collections.defaultdict(list))
    for a in cat.values():
        m = a.get("metrics") or {}
        if a["kind"] == "model" and m.get("rigged") and "/animations/" not in a["id"] and m.get("bbox"):
            rig = next((n for n in (m.get("nodeNames") or []) if re.match(r"^Rig_[A-Za-z]+$", n)), "rigged")
            by[a["pack"]][rig.lower().replace("_", "-")].append(m["bbox"]["size"][1])
    out = {}
    for pack, rigs in by.items():
        out[pack] = ", ".join(f"{r} characters ~{statistics.median(v):.1f} m tall (range {min(v):.1f}-{max(v):.1f}, {len(v)} models)" for r, v in
                              sorted(rigs.items(), key=lambda kv: -len(kv[1])))
    return out


def header(set_id: str, st: dict) -> str:
    lic = "CC0 (redistributable)" if st["licence"] == "cc0" else \
        "NOT redistributable: games on this server only (exclude from exportable/open-source games)"
    lines = [f"**Licence:** {lic}  ", f"**Assets:** {st['n']} ({pct(st['kinds'], 6)})  ",
             f"**Style:** {pct(st['styles'])} · **View:** {pct(st['views'])}  ",
             f"**Engine kit:** {engine_for(st)}  "]
    m = st.get("models")
    if m:
        piv = ", ".join(f"{k} {v}" for k, v in m["pivots"].most_common(3) if k)
        lines.append(f"**3D scale:** metres, Y-up; median height {m['heightMedian']} m (range {m['heightRange'][0]}-"
                     f"{m['heightRange'][1]}), median footprint {m['footprintMedian']} m; common footprints "
                     f"{', '.join(str(f[0]) for f in m['footprints'])} m; pivots: {piv}; tris median {m['trisMedian']}"
                     f" (max {m['trisMax']}); textured {m['textured']}/{m['count']}  ")
        ref = CHAR_REF.get(set_id.split("/")[0])
        if ref:
            lines.append(f"**Scale reference (whole pack):** {ref}  ")
        if m["rigged"] or m["withClips"]:
            lines.append(f"**Rigs/animation:** {m['rigged']} rigged, {m['withClips']} with clips"
                         + (f" ({', '.join(m['clipNames'][:16])}{'...' if len(m['clipNames']) > 16 else ''})" if m["clipNames"] else "")
                         + "  ")
    s = st.get("sprites")
    if s:
        lines.append(f"**2D sizes:** {', '.join(f'{k} px ({v})' for k, v in s['sizes'])}"
                     + (f"; {s['vector']} vector (SVG)" if s["vector"] else "") + "  ")
    if st.get("tilesets"):
        lines.append("**Tilesets:** " + "; ".join(f"`{i}` {w}x{h} px tiles, {c} tiles, spacing {sp}" for i, w, h, c, sp in st["tilesets"][:4]) + "  ")
    if st.get("spritesheets"):
        lines.append("**Sheets/atlases:** " + "; ".join(f"`{i}`" + (f" {f} frames" if f else "") + (f" grid {g}px" if g else "")
                                                     for i, f, g in st["spritesheets"][:4]) + "  ")
    if st.get("animations"):
        a = st["animations"]
        lines.append(f"**Frame animations:** {a['count']} (frames: {', '.join(str(f[0]) for f in a['frames'])}; "
                     f"frame size {', '.join(f[0] for f in a['frameSizes'])} px)  ")
    if st.get("audio"):
        a = st["audio"]
        lines.append(f"**Audio:** {a['count']} clips, median {a['durMedian']} s, longest {a['durMax']} s (ogg + mp3)  ")
    subs = st["subs"]
    if len(subs) > 1:
        lines.append(f"**Sub-folders:** {', '.join(f'{k} ({v})' for k, v in subs.most_common(14))}"
                     + (" ..." if len(subs) > 14 else "") + "  ")
    return "\n".join(lines)


CARD_SYSTEM = """You write short reference cards about game-asset sets for an AI game builder. The builder uses the
card to decide whether the set fits a game and how to combine its pieces correctly. You get the set's facts and a
contact image of representative previews (numbered). Write Markdown, max ~230 words, with exactly these sections:

## What it is
1-2 sentences: subject/theme, what kinds of game it suits (genres).
## Look
Art style in plain words (palette, outlines, shading, resolution), perspective, and which other sets it would look
consistent with in general terms (e.g. "other flat low-poly kits"), and what NOT to mix it with.
## Pieces and how they combine
Bullets: the main piece families (use real name patterns from the facts, e.g. `wall-*`, `floor-*`, `tree-*`,
colour variants), modular rules (grid size in metres or pixels, corners/straights/ends, snapping, pivots, which
pieces go together), characters + animation sets, UI parts (9-slice etc.). Concrete and correct; do not invent
pieces that are not in the facts.
## Use in the engine
1-3 bullets for the NullKode kit named in the facts (phaser-2d: atlas/tileset keys, frame names, tile size,
pixelArt:true for pixel art; three-3d: NK3D.model/instances, scale/units, physics shapes). Keep it practical.
Only state sizes/scales that are in the facts (never assume a character height; use the scale reference if given).

No title line (it is added for you). No licence text (already in the header). No emoji."""


def pick_representatives(assets, tags, k=30):
    """Spread picks over sub-folders and kinds; prefer AI-tagged entries."""
    by = collections.defaultdict(list)
    for a in assets:
        by[(a["category"], a["kind"])].append(a)
    groups = sorted(by.values(), key=len, reverse=True)
    picks = []
    i = 0
    while len(picks) < k and any(groups):
        g = groups[i % len(groups)]
        if g:
            step = max(1, len(g) // 6)
            idx = (i // len(groups)) * step
            if idx < len(g):
                picks.append(g[idx])
            else:
                g.clear()
        i += 1
        if i > 5000:
            break
    seen, out = set(), []
    for a in picks:
        leaf = a["id"].rsplit("/", 1)[1]
        if leaf not in seen:
            seen.add(leaf)
            out.append(a)
    if len(out) < k:  # top up with unpicked distinct names
        for a in assets[:: max(1, len(assets) // (k * 2))]:
            leaf = a["id"].rsplit("/", 1)[1]
            if leaf not in seen:
                seen.add(leaf)
                out.append(a)
            if len(out) >= k:
                break
    return out[:k]


def contact_image(picks) -> bytes:
    from PIL import Image, ImageDraw, ImageFont
    cell, cols, rows = 216, 6, 5
    W, H = cols * cell, rows * cell
    im = Image.new("RGB", (W, H), (236, 236, 236))
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    for n, a in enumerate(picks):
        x, y = (n % cols) * cell, (n // cols) * cell
        p = os.path.join(LIB, a["preview"])
        try:
            pv = Image.open(p).convert("RGBA")
            pv.thumbnail((cell - 8, cell - 8))
            bg = Image.new("RGBA", pv.size, (255, 255, 255, 255))
            bg.alpha_composite(pv)
            im.paste(bg.convert("RGB"), (x + (cell - pv.width) // 2, y + (cell - pv.height) // 2))
        except Exception:
            pass
        d.rectangle([x, y, x + cell - 1, y + cell - 1], outline=(190, 190, 190))
        d.rectangle([x, y, x + 30, y + 24], fill=(20, 20, 20))
        d.text((x + 4, y + 2), str(n + 1), fill=(255, 255, 255), font=font)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=82)
    return buf.getvalue()


def card_facts(set_id, assets, tags, st, picks) -> str:
    lines = [f"Set: {set_id}", "Header facts:", header(set_id, st), "",
             "Name patterns (sub-folder: example ids, AI names):"]
    by = collections.defaultdict(list)
    for a in assets:
        by["/".join(a["category"].split("/")[2:]) or "(root)"].append(a)
    for sub, items in sorted(by.items(), key=lambda kv: -len(kv[1]))[:20]:
        names = []
        for a in items[:: max(1, len(items) // 12)][:12]:
            t = tags.get(a["id"]) or {}
            names.append(f"{a['id'].rsplit('/', 1)[1]}" + (f" ({t['name']})" if t.get("name") else ""))
        lines.append(f"- {sub} [{len(items)}]: " + "; ".join(names))
    tagc = collections.Counter(t for a in assets for t in (tags.get(a["id"]) or {}).get("tags", []))
    lines.append("Top tags: " + ", ".join(t for t, _ in tagc.most_common(30)))
    uses = [tags[a["id"]]["use"] for a in picks if tags.get(a["id"], {}).get("use")][:10]
    if uses:
        lines.append("Sample usage notes from tagging: " + " | ".join(uses))
    lines.append("")
    lines.append("Contact image numbers:")
    for n, a in enumerate(picks):
        t = tags.get(a["id"]) or {}
        lines.append(f"{n + 1} | {a['id']} | {a['kind']} | {facts(a)}" + (f" | {t['name']}" if t.get("name") else ""))
    return "\n".join(lines)


def card_path(set_id):
    pack, s = set_id.split("/", 1)
    return os.path.join(CARDS_DIR, pack, s + ".md")


def title_of(set_id, assets):
    sp = assets[0].get("sourcePath", "")
    parts = sp.split("/")
    # Kenney: "3D assets/Nature Kit/..." ; KayKit: "The Complete KayKit Collection v7/KayKit Dungeon Pack 1.1/..."
    if assets[0]["pack"] == "kenney" and len(parts) > 2:
        return parts[1]
    if assets[0]["pack"] == "kaykit" and len(parts) > 2:
        return re.sub(r"\s+\d+(\.\d+)*$", "", parts[1])
    if assets[0]["pack"] in ("quaternius", "pixel-frog") and len(parts) > 1:
        t = re.sub(r"\s*\[[^\]]*\]$", "", parts[0])  # 'Some Kit[Standard]' -> 'Some Kit'
        return ("Quaternius " if assets[0]["pack"].startswith("quaternius") else "Pixel Frog ") + t
    return set_id.split("/", 1)[1].replace("-", " ").title()


def build_one(set_id, assets, tags, args, quota):
    out = card_path(set_id)
    st = set_stats(assets, tags)
    picks = pick_representatives(assets, tags)
    sig = f"v{CARD_VERSION}:{len(assets)}:{sum(1 for a in assets if a['id'] in tags and tags[a['id']].get('source') == 'ai')}"
    if os.path.exists(out) and not args.redo:
        first = open(out, encoding="utf-8").read(400)
        if f"<!-- card {sig} -->" in first:
            return "skip", 0.0
    head = header(set_id, st)
    body, cost, err = None, 0.0, None
    if args.no_ai:
        if os.path.exists(out):
            return "skip", 0.0  # never replace an AI card with a header-only one
        sig = "noai"
        body = "## What it is\n(Summary pending: the AI card pass has not run for this set yet. See the header facts and `asset-search --set`.)\n"
    text = card_facts(set_id, assets, tags, st, picks) if body is None else ""
    img = contact_image(picks) if body is None else b""
    for attempt in range(0 if body is not None else 2):
        quota.wait()
        try:
            r = runner.run(CARD_SYSTEM, text, images=[("image/webp", img)], model=args.model, effort=args.effort,
                           timeout=args.timeout)
        except runner.AIError as e:
            err = str(e)
            append_jsonl(CALLS, {"card": set_id, "model": args.model, "ok": False, "error": err[:200]})
            continue
        quota.update(r.get("rate_limit"))
        cost += r["cost_usd"]
        append_jsonl(CALLS, {"card": set_id, "model": args.model, "ok": True, "ms": r["duration_ms"],
                             "cost": r["cost_usd"], "out": r["usage"].get("output_tokens")})
        t = r["text"].strip()
        t = re.sub(r"^```(?:markdown|md)?\s*|\s*```$", "", t)
        if "## What it is" in t and "## Pieces" in t:
            body = t[t.index("## What it is"):]
            break
        err = "card missing sections"
    if body is None:
        append_jsonl(FAILURES, {"card": set_id, "error": err})
        sig = "noai"
        body = "## What it is\n(AI summary unavailable; see header facts.)\n"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    md = (f"<!-- card {sig} -->\n# {set_id} - {title_of(set_id, assets)}\n\n{head}\n\n{body.strip()}\n\n"
          f"Search: `asset-search --set \"{set_id}\"` (whole set), `asset-search \"<words>\" --pack {set_id}`\n")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(md)
    return "ok", cost


def group_sets(cat):
    sets = collections.defaultdict(list)
    for a in cat.values():
        sets[set_of(a["id"])].append(a)
    for v in sets.values():
        v.sort(key=lambda a: a["id"])
    return sets


def cmd_build(args):
    cat = load_catalog()
    CHAR_REF.update(char_refs(cat))
    tags = load_tags()
    sets = group_sets(cat)
    ids = sorted(sets)
    if args.only:
        ids = [i for i in ids if i in set(args.only.split(","))]
    quota = Quota(args.max_week, args.max_5h)
    log(f"cards: {len(ids)} sets, model {args.model}")
    tot = 0.0
    with ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        futs = {ex.submit(build_one, i, sets[i], tags, args, quota): i for i in ids}
        for n, f in enumerate(as_completed(futs), 1):
            i = futs[f]
            try:
                status, c = f.result()
            except Exception as e:  # noqa
                status, c = f"error {e}", 0.0
                append_jsonl(FAILURES, {"card": i, "error": str(e)[:300]})
            tot += c
            if status != "skip":
                log(f"card {i}: {status} ${c:.3f} | {n}/{len(ids)} ${tot:.2f} | {quota.text()}")
    cmd_index(args)


def cmd_index(args):
    cat = load_catalog()
    CHAR_REF.update(char_refs(cat))
    tags = load_tags()
    sets = group_sets(cat)
    rows = []
    for i in sorted(sets):
        st = set_stats(sets[i], tags)
        p = card_path(i)
        summary = ""
        if os.path.exists(p):
            md = open(p, encoding="utf-8").read()
            m = re.search(r"## What it is\s*\n(.+?)(\n##|\Z)", md, re.S)
            if m and "Summary pending" not in m.group(1):
                summary = " ".join(m.group(1).split())[:260]
        rows.append({"set": i, "title": title_of(i, sets[i]), "pack": i.split("/")[0], "assets": st["n"],
                     "kinds": dict(st["kinds"]), "style": st["styles"].most_common(1)[0][0],
                     "view": st["views"].most_common(1)[0][0], "engine": engine_for(st), "licence": st["licence"],
                     "redistributable": st["redistributable"], "summary": summary,
                     "card": os.path.relpath(p, LIB) if os.path.exists(p) else None})
    with open(os.path.join(CARDS_DIR, "cards.json.tmp"), "w") as fh:  # live readers: swap atomically
        json.dump(rows, fh, ensure_ascii=False, indent=0)
    os.replace(os.path.join(CARDS_DIR, "cards.json.tmp"), os.path.join(CARDS_DIR, "cards.json"))
    lines = ["# Asset set cards", "", f"{len(rows)} sets. One line each: set | assets | main kinds | style | view | engine | licence | summary.",
             "Open `_cards/<pack>/<set>.md` for the full card.", ""]
    for r in rows:
        kinds = ",".join(k for k, _ in collections.Counter(r["kinds"]).most_common(3))
        lic = "cc0" if r["licence"] == "cc0" else "not-redistributable"
        lines.append(f"- `{r['set']}` ({r['title']}) | {r['assets']} | {kinds} | {r['style']} | {r['view']} | "
                     f"{r['engine'].split(' ')[0]} | {lic} | {r['summary'][:160]}")
    open(os.path.join(CARDS_DIR, "INDEX.md.tmp"), "w").write("\n".join(lines) + "\n")
    os.replace(os.path.join(CARDS_DIR, "INDEX.md.tmp"), os.path.join(CARDS_DIR, "INDEX.md"))
    print(f"index: {len(rows)} sets -> {CARDS_DIR}/INDEX.md, cards.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["build", "index"])
    ap.add_argument("--model", default=os.environ.get("NK_TAG_MODEL", ""))
    ap.add_argument("--effort", default="low")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--only", default="")
    ap.add_argument("--redo", action="store_true")
    ap.add_argument("--no-ai", action="store_true", help="write header-only cards for sets without a card")
    ap.add_argument("--timeout", type=float, default=600)
    ap.add_argument("--max-week", type=float, default=0.90)
    ap.add_argument("--max-5h", type=float, default=0.70)
    args = ap.parse_args()
    os.makedirs(CARDS_DIR, exist_ok=True)
    {"build": cmd_build, "index": cmd_index}[args.cmd](args)


if __name__ == "__main__":
    main()
