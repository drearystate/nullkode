#!/usr/bin/env python3
"""AI tagging pass over the contact sheets.

  nice -n 10 python3 tag.py sheets [--model M] [--effort low] [--concurrency 4] [--limit N] [--only s00001,...]
                                     [--redo] [--redo-version] [--max-week 0.93] [--max-5h 0.80]
  nice -n 10 python3 tag.py audio  [--model M]          # text-only batches of 100 clips
  python3 tag.py status                                  # coverage + cost so far
  python3 tag.py merge                                   # write game-assets/tags.jsonl

One call per sheet (30 assets): the sheet image + each asset's facts. Results go to
game-assets/_tags/sheets/<sheet>.json (resumable: done sheets are skipped). Failures -> work/tagging/failures.jsonl.
The AI is called through runner.py (any OpenAI-compatible API, see there). The quota guard
(--max-week, --max-5h) only acts when an API reports usage windows.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (KINDS, STYLES, VIEWS, ROLES, TAGS_DIR, TAGS_FILE, SHEETS_DIR, WORK, load_catalog,
                    load_sheets, facts, slug_words, set_of)
import prompts
import runner

AUDIO_KINDS = {"sfx", "music"}
PACK_WORDS = {"kenney", "kaykit", "kay", "lousberg"}
LOG_LOCK = threading.Lock()
os.makedirs(WORK, exist_ok=True)
os.makedirs(os.path.join(TAGS_DIR, "sheets"), exist_ok=True)
os.makedirs(os.path.join(TAGS_DIR, "audio"), exist_ok=True)
PROGRESS = os.path.join(WORK, "progress.log")
FAILURES = os.path.join(WORK, "failures.jsonl")
CALLS = os.path.join(WORK, "calls.jsonl")


def log(msg: str):
    line = time.strftime("%Y-%m-%d %H:%M:%S ") + msg
    with LOG_LOCK:
        with open(PROGRESS, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
        print(line, flush=True)


def append_jsonl(path, obj):
    with LOG_LOCK:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------- quota guard
class Quota:
    def __init__(self, max_week: float, max_5h: float):
        self.max_week = max_week
        self.max_5h = max_5h
        self.lock = threading.Lock()
        self.five = None   # (util, resetsAt)
        self.week = None

    def update(self, rl: dict | None):
        if not rl:
            return
        w = rl.get("unifiedWindows") or {}
        with self.lock:
            if "five_hour" in w:
                self.five = (w["five_hour"].get("utilization", 0) or 0, w["five_hour"].get("resetsAt"))
            if "seven_day" in w:
                self.week = (w["seven_day"].get("utilization", 0) or 0, w["seven_day"].get("resetsAt"))

    def _reload_caps(self):
        """Live override: work/tagging/caps.json {"max_week": 0.88, "max_5h": 0.7, "pause": false}."""
        try:
            c = json.load(open(os.path.join(WORK, "caps.json")))
        except (OSError, ValueError):
            return False
        self.max_week = float(c.get("max_week", self.max_week))
        self.max_5h = float(c.get("max_5h", self.max_5h))
        return bool(c.get("pause"))

    def wait(self):
        """Block while a window is above its cap (until it resets)."""
        while self._reload_caps():
            time.sleep(60)
        while True:
            with self.lock:
                five, week = self.five, self.week
            hold = None
            if week and week[0] >= self.max_week and week[1]:
                hold = ("7-day", week)
            elif five and five[0] >= self.max_5h and five[1]:
                hold = ("5-hour", five)
            if not hold:
                return
            name, (util, reset) = hold
            secs = reset - time.time() + 60
            if secs <= 0:
                with self.lock:  # window should have reset; probe again with the next call
                    if name == "7-day":
                        self.week = None
                    else:
                        self.five = None
                return
            log(f"quota: {name} window at {util:.0%} (cap {self.max_week if name == '7-day' else self.max_5h:.0%}); "
                f"pausing until {time.strftime('%Y-%m-%d %H:%M', time.gmtime(reset))} UTC")
            time.sleep(min(secs, 900))

    def text(self):
        f = f"5h {self.five[0]:.0%}" if self.five else "5h ?"
        w = f"7d {self.week[0]:.0%}" if self.week else "7d ?"
        return f"{f}, {w}"


# ---------------------------------------------------------------- JSON parsing / validation
def extract_json(text: str):
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```\s*$", "", t)
    try:
        return json.loads(t)
    except ValueError:
        pass
    a, b = t.find("{"), t.rfind("}")
    if a != -1 and b > a:
        return json.loads(t[a:b + 1])
    raise ValueError("no JSON object in reply")


def norm_tag(t: str) -> str:
    t = str(t).strip().lower()
    t = re.sub(r"[\s_]+", "-", t)
    t = re.sub(r"[^a-z0-9\-+/&']", "", t)
    return t.strip("-")


def validate(items_in, expected: list[dict], audio=False) -> tuple[dict, list[str]]:
    """expected: [{n, id, kind}]. Returns ({id: record}, problems)."""
    problems = []
    common = {}
    if isinstance(items_in, dict):
        common = items_in.get("common") if isinstance(items_in.get("common"), dict) else {}
        items_in = items_in.get("items")
    if not isinstance(items_in, list):
        return {}, ["reply has no items list"]
    by_n = {}
    for it in items_in:
        if isinstance(it, dict) and isinstance(it.get("n"), (int, str)):
            try:
                by_n[int(it["n"])] = it
            except ValueError:
                pass
    out = {}
    for e in expected:
        it = by_n.get(e["n"])
        if not it:
            problems.append(f"missing n={e['n']}")
            continue
        name = str(it.get("name") or "").strip()
        desc = str(it.get("desc") or it.get("description") or "").strip()
        use = str(it.get("use") or it.get("usage") or common.get("use") or "").strip()
        kind = str(it.get("kind") or e["kind"]).strip().lower()
        if kind not in KINDS:
            kind = e["kind"]
        locked = {"model", "sfx", "music", "font", "animation", "tileset"}
        if e["kind"] in locked or kind in locked:
            if kind != e["kind"]:
                kind = e["kind"]
        tags = []
        for t in list(it.get("tags") or []) + list(common.get("tags") or []):
            t = norm_tag(t)
            if t and t not in tags and len(t) <= 32 and t not in PACK_WORDS:
                tags.append(t)
        roles = [norm_tag(r) for r in (it.get("roles") or common.get("roles") or []) if norm_tag(r)]
        roles = [r for r in roles if r in ROLES][:4]
        rec = {"name": name[:80], "kind": kind, "desc": desc[:300], "tags": tags[:20], "roles": roles, "use": use[:240]}
        if not audio:
            style = norm_tag(it.get("style") or common.get("style") or "")
            view = norm_tag(it.get("view") or common.get("view") or "")
            rec["style"] = style if style in STYLES else None
            rec["view"] = view if view in VIEWS else None
        if not name or not desc or len(tags) < 5:
            problems.append(f"n={e['n']} incomplete (name/desc/tags)")
            continue
        out[e["id"]] = rec
    return out, problems


# ---------------------------------------------------------------- prompts
def common_prefix(ids: list[str]) -> str:
    parts = [i.split("/") for i in ids]
    pre = []
    for seg in zip(*parts):
        if all(s == seg[0] for s in seg):
            pre.append(seg[0])
        else:
            break
    if len(pre) == len(parts[0]):  # all ids identical (shouldn't happen)
        pre = pre[:-1]
    return "/".join(pre)


def sheet_text(sheet: dict, cat: dict) -> tuple[str, list[dict]]:
    items = sheet["items"]
    ids = [it["id"] for it in items]
    pre = common_prefix(ids)
    a0 = cat[ids[0]]
    lic = a0["licence"]
    lines = [f"Sheet {sheet['file']} - pack {a0['pack']} ({lic}), {len(items)} cells numbered 1-{len(items)}."]
    if pre:
        lines.append(f"All ids start with: {pre}/")
    lines.append("Facts: n | id (after prefix) | kind | metrics | source folder (printed when it changes)")
    last_folder = None
    expected = []
    for it in items:
        a = cat[it["id"]]
        sp = a.get("sourcePath", "")
        folder = sp.rsplit("/", 1)[0] if "/" in sp else ""
        # trim pack root folder noise (KayKit collection name)
        folder = folder.replace("The Complete KayKit Collection v7/", "")
        short = a["id"][len(pre) + 1:] if pre else a["id"]
        row = f"{it['n']} | {short} | {a['kind']} | {facts(a)}"
        if folder != last_folder:
            row += f" | folder: {folder}"
            last_folder = folder
        lines.append(row)
        expected.append({"n": it["n"], "id": a["id"], "kind": a["kind"]})
    return "\n".join(lines), expected


# ---------------------------------------------------------------- sheet worker
def sheet_out_path(sheet_file: str) -> str:
    return os.path.join(TAGS_DIR, "sheets", sheet_file.replace(".webp", ".json"))


def is_done(sheet: dict, redo_version: bool) -> bool:
    p = sheet_out_path(sheet["file"])
    if not os.path.exists(p):
        return False
    try:
        d = json.load(open(p, encoding="utf-8"))
    except ValueError:
        return False
    if d.get("sig") != sheet["sig"]:
        return False
    if redo_version and d.get("promptVersion") != prompts.PROMPT_VERSION:
        return False
    return len(d.get("items", {})) >= len(sheet["items"])


def tag_sheet(sheet: dict, cat: dict, args, quota: Quota) -> dict:
    text, expected = sheet_text(sheet, cat)
    with open(os.path.join(SHEETS_DIR, sheet["file"]), "rb") as fh:
        img = fh.read()
    good: dict = {}
    calls = []
    problems: list[str] = []
    todo = expected
    for attempt in range(2):
        quota.wait()
        msg = text
        if attempt:
            msg += ("\n\nYour previous reply was not usable (" + "; ".join(problems[:6]) +
                    "). Return the complete JSON object for these numbers only: " +
                    ",".join(str(e["n"]) for e in todo))
        try:
            r = runner.run(prompts.SHEET_SYSTEM, msg, images=[("image/webp", img)], model=args.model,
                           effort=args.effort, timeout=args.timeout)
        except runner.AIError as e:
            problems = [str(e)]
            calls.append({"ok": False, "error": str(e)[:200]})
            if "usage limit" in str(e).lower() or "rate" in str(e).lower():
                time.sleep(300)
            continue
        quota.update(r.get("rate_limit"))
        u = r["usage"]
        calls.append({"ok": True, "ms": r["duration_ms"], "cost": r["cost_usd"], "in": u.get("input_tokens"),
                      "cacheRead": u.get("cache_read_input_tokens"), "cacheWrite": u.get("cache_creation_input_tokens"),
                      "out": u.get("output_tokens"),
                      "thinking": (u.get("output_tokens_details") or {}).get("thinking_tokens")})
        try:
            parsed = extract_json(r["text"])
            got, problems = validate(parsed, todo)
        except ValueError as e:
            got, problems = {}, [f"invalid JSON: {e}"[:150]]
        good.update(got)
        todo = [e for e in todo if e["id"] not in good]
        if not todo:
            break
    rec = {"sheet": sheet["file"], "sig": sheet["sig"], "model": args.model, "effort": args.effort,
           "promptVersion": prompts.PROMPT_VERSION, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "calls": calls, "items": good}
    if good:
        with open(sheet_out_path(sheet["file"]) + ".tmp", "w", encoding="utf-8") as fh:
            json.dump(rec, fh, ensure_ascii=False)
        os.replace(sheet_out_path(sheet["file"]) + ".tmp", sheet_out_path(sheet["file"]))
    if todo:
        append_jsonl(FAILURES, {"sheet": sheet["file"], "at": rec["at"], "missing": [e["id"] for e in todo],
                                "problems": problems[:10]})
    for c in calls:
        append_jsonl(CALLS, {"sheet": sheet["file"], "model": args.model, **c})
    return {"sheet": sheet["file"], "ok": len(good), "missing": len(todo), "calls": calls}


def cmd_sheets(args):
    cat = load_catalog()
    sh = load_sheets()["sheets"]
    sheets = [s for s in sh if not all(it["kind"] in AUDIO_KINDS for it in s["items"])]
    twins = load_twins()
    skipped = [s for s in sheets if all(it["id"] in twins for it in s["items"])]
    if skipped and not args.only:
        log(f"skipping {len(skipped)} sheets made only of vector (SVG) twins; they inherit their PNG twin's tags")
        sheets = [s for s in sheets if s not in skipped]
    if args.only:
        want = set(x if x.endswith(".webp") else x + ".webp" for x in args.only.split(","))
        sheets = [s for s in sheets if s["file"] in want]
    if not args.redo:
        sheets = [s for s in sheets if not is_done(s, args.redo_version)]
    if args.shuffle:
        import random
        random.Random(7).shuffle(sheets)
    if args.limit:
        sheets = sheets[:args.limit]
    log(f"start: {len(sheets)} sheets to tag, model {args.model}, effort {args.effort}, concurrency {args.concurrency}")
    quota = Quota(args.max_week, args.max_5h)
    t0 = time.time()
    done = items = missing = 0
    cost = 0.0
    with ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        futs = {}
        it = iter(sheets)
        # submit lazily so the quota guard can stop new work
        def submit_next():
            try:
                s = next(it)
            except StopIteration:
                return False
            futs[ex.submit(tag_sheet, s, cat, args, quota)] = s
            return True
        for _ in range(args.concurrency):
            submit_next()
        while futs:
            for f in as_completed(list(futs)):
                s = futs.pop(f)
                try:
                    res = f.result()
                except Exception as e:  # noqa
                    log(f"ERROR {s['file']}: {e}")
                    append_jsonl(FAILURES, {"sheet": s["file"], "error": str(e)[:300]})
                    res = {"ok": 0, "missing": len(s["items"]), "calls": []}
                done += 1
                items += res["ok"]
                missing += res["missing"]
                c = sum(x.get("cost", 0) or 0 for x in res["calls"])
                cost += c
                el = time.time() - t0
                eta = el / done * (len(sheets) - done)
                log(f"{s['file']} ok={res['ok']} miss={res['missing']} calls={len(res['calls'])} "
                    f"${c:.3f} | {done}/{len(sheets)} items={items} miss={missing} ${cost:.2f} "
                    f"{el/60:.1f}m eta {eta/60:.0f}m | {quota.text()}")
                submit_next()
                break
    log(f"finished: {done} sheets, {items} items, {missing} missing, ${cost:.2f}, {(time.time()-t0)/60:.1f} min")


# ---------------------------------------------------------------- audio
def cmd_audio(args):
    cat = load_catalog()
    clips = sorted([a for a in cat.values() if a["kind"] in AUDIO_KINDS], key=lambda a: a["id"])
    batches = [clips[i:i + 100] for i in range(0, len(clips), 100)]
    quota = Quota(args.max_week, args.max_5h)
    log(f"audio: {len(clips)} clips in {len(batches)} batches")

    def one(bi, batch):
        out = os.path.join(TAGS_DIR, "audio", f"a{bi:03d}.json")
        sig = "|".join(a["id"] for a in batch)
        if os.path.exists(out) and not args.redo:
            d = json.load(open(out))
            if d.get("sig") == sig and len(d.get("items", {})) >= len(batch):
                return 0, 0, 0.0
        expected = [{"n": i + 1, "id": a["id"], "kind": a["kind"]} for i, a in enumerate(batch)]
        lines = ["Clips: n | id | kind | duration | source path"]
        for e, a in zip(expected, batch):
            lines.append(f"{e['n']} | {a['id']} | {a['kind']} | {a['metrics'].get('duration', 0):.2f}s | "
                         f"{a.get('sourcePath', '')}")
        text = "\n".join(lines)
        good, todo, problems, calls = {}, expected, [], []
        for attempt in range(2):
            quota.wait()
            msg = text if not attempt else text + "\n\nPrevious reply unusable (" + "; ".join(problems[:5]) + \
                "). Return the JSON for these numbers only: " + ",".join(str(e["n"]) for e in todo)
            try:
                r = runner.run(prompts.AUDIO_SYSTEM, msg, model=args.model, effort=args.effort, timeout=args.timeout)
            except runner.AIError as e:
                problems = [str(e)]
                calls.append({"ok": False, "error": str(e)[:200]})
                continue
            quota.update(r.get("rate_limit"))
            u = r["usage"]
            calls.append({"ok": True, "ms": r["duration_ms"], "cost": r["cost_usd"], "in": u.get("input_tokens"),
                          "out": u.get("output_tokens")})
            try:
                got, problems = validate(extract_json(r["text"]), todo, audio=True)
            except ValueError as e:
                got, problems = {}, [f"invalid JSON: {e}"[:150]]
            good.update(got)
            todo = [e for e in todo if e["id"] not in good]
            if not todo:
                break
        rec = {"batch": bi, "sig": sig, "model": args.model, "promptVersion": prompts.PROMPT_VERSION,
               "calls": calls, "items": good}
        json.dump(rec, open(out, "w"), ensure_ascii=False)
        if todo:
            append_jsonl(FAILURES, {"audioBatch": bi, "missing": [e["id"] for e in todo], "problems": problems[:5]})
        for c in calls:
            append_jsonl(CALLS, {"audioBatch": bi, "model": args.model, **c})
        return len(good), len(todo), sum(c.get("cost", 0) or 0 for c in calls)

    with ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        futs = [ex.submit(one, i, b) for i, b in enumerate(batches)]
        for f in as_completed(futs):
            ok, miss, c = f.result()
            log(f"audio batch ok={ok} miss={miss} ${c:.3f} | {quota.text()}")


# ---------------------------------------------------------------- rules fallback (audio/anything untagged)
AUDIO_SYN = {
    "click": ["tap", "press", "ui", "button"], "coin": ["pickup", "collect", "money", "gold"],
    "jump": ["hop", "leap"], "laser": ["shoot", "blaster", "zap", "sci-fi"], "explosion": ["boom", "blast"],
    "footstep": ["step", "walk", "movement"], "hit": ["impact", "punch"], "impact": ["hit", "thud"],
    "door": ["open", "close"], "powerup": ["power-up", "upgrade", "bonus"], "jingle": ["stinger", "music"],
    "lose": ["fail", "game-over"], "win": ["victory", "success"], "error": ["negative", "wrong"],
    "confirm": ["positive", "select", "ok"], "select": ["choose", "ui"], "switch": ["toggle", "ui"],
}


def rules_record(a: dict) -> dict:
    words = []
    for w in slug_words(a["id"].split("/", 1)[1]) + slug_words(a.get("sourcePath", "")):
        if not w.isdigit() and w not in words and len(w) > 1 and w not in ("audio", "ogg", "wav", "png", "sounds"):
            words.append(w)
    tags = list(words)
    for w in words:
        for s in AUDIO_SYN.get(w, []):
            if s not in tags:
                tags.append(s)
    d = (a.get("metrics") or {}).get("duration")
    if a["kind"] in AUDIO_KINDS and d is not None:
        tags.append("short" if d < 1 else ("loop" if d > 20 and a["kind"] == "music" else "medium"))
    nm = a["name"].strip().capitalize()
    return {"name": nm, "kind": a["kind"], "desc": f"{a['kind']} '{a['name']}' from {set_of(a['id'])}.",
            "tags": tags[:20], "roles": ["music-loop" if a["kind"] == "music" else "sfx-event"]
            if a["kind"] in AUDIO_KINDS else [], "use": "", "style": None, "view": None}


# ---------------------------------------------------------------- merge
UNIT = r"(?!\s*(?:px|m\b|cm|fps|frames?|s\b|sec|x\b|x\d|%|°|deg|-frame|-tile|-way|-direction|-step|-part|-slice|-piece|tiles? (?:wide|high|tall)))"
NUM_CTX = re.compile(r"(\b(?:tiles?|items?|pieces?|cells?|numbers?|nos?\.?|with|and|or|plus|see|via|beside|like|to|"
                     r"repeat|between|after|before|then|above|below|under|over)\s+)"
                     r"(\d{1,2})(?:(\s*[-–]\s*)(\d{1,2}))?(?!\w|\.\d)" + UNIT, re.I)
NUM_PAREN = re.compile(r"\((\s*\d{1,2}(?:\s*(?:[,/–-]|and)\s*\d{1,2})*\s*)(\s+[a-z]+)?\)")


def fix_sheet_refs(text: str, leaf_by_n: dict) -> str:
    """Replace contact-sheet cell numbers ('pair with lid (7)', 'tiles 19-21') by the asset id leaf names."""
    if not text or not re.search(r"\d", text):
        return text
    def leaf(n):
        return leaf_by_n.get(int(n))
    def ctx(m):
        a, b = leaf(m.group(2)), leaf(m.group(4)) if m.group(4) else None
        if not a or (m.group(4) and not b):
            return m.group(0)
        return m.group(1) + (f"{a} to {b}" if b else a)
    def paren(m):
        out = []
        for part in re.split(r"\s*(?:,|/|and)\s*", m.group(1).strip()):
            ab = re.split(r"\s*[-–]\s*", part)
            ls = [leaf(x) for x in ab if x]
            if not ls or not all(ls):
                return m.group(0)
            out.append(" to ".join(ls))
        return "(" + ", ".join(out) + (m.group(2) or "") + ")"
    text = NUM_PAREN.sub(paren, text)
    text = NUM_CTX.sub(ctx, text)
    return re.sub(r"\btiles? (tile-)", r"\1", text)


RULE_STYLE = {"hd": "cartoon-hd", "vector": "flat-vector", "hand-drawn": "hand-drawn", "voxel": "voxel"}


def fix_style(r: dict, a: dict) -> dict:
    """Small smooth images look pixelated once the contact sheet scales them up. When the AI says pixel-* but the
    importer saw a non-pixel pack and the image has many colours (anti-aliasing), keep the importer's style."""
    st = r.get("style") or ""
    if not st.startswith("pixel"):
        return r
    rule = a.get("style") or []
    if any(x.startswith("pixel") for x in rule):
        return r
    col = (a.get("metrics") or {}).get("colors")
    many = col == ">256" or (isinstance(col, int) and col > 32)
    if not many:
        return r
    new = next((RULE_STYLE[x] for x in rule if x in RULE_STYLE), "cartoon-hd")
    tags = [t for t in r.get("tags", []) if t not in ("pixel", "pixel-art", "8-bit", "16-bit", "8bit", "16bit", "retro")]
    return dict(r, style=new, tags=tags, styleFixed=st)


def cmd_merge(args):
    cat = load_catalog()
    recs = {}
    src = {}
    sheets_by_file = {s["file"].replace(".webp", ".json"): s for s in load_sheets()["sheets"]}
    n_fixed = 0
    for d, kind in ((os.path.join(TAGS_DIR, "sheets"), "ai-sheet"), (os.path.join(TAGS_DIR, "audio"), "ai-audio")):
        for f in sorted(os.listdir(d)):
            if not f.endswith(".json"):
                continue
            j = json.load(open(os.path.join(d, f), encoding="utf-8"))
            sh = sheets_by_file.get(f) if kind == "ai-sheet" else None
            leaf_by_n = {it["n"]: it["id"].rsplit("/", 1)[1] for it in sh["items"]} if sh else {}
            for i, r in j.get("items", {}).items():
                if leaf_by_n:
                    u, dsc = fix_sheet_refs(r.get("use", ""), leaf_by_n), fix_sheet_refs(r.get("desc", ""), leaf_by_n)
                    if u != r.get("use") or dsc != r.get("desc"):
                        n_fixed += 1
                        r = dict(r, use=u, desc=dsc)
                if i in cat:
                    recs[i] = r
                    src[i] = (kind, j.get("model"), j.get("sheet") or f)
    twins = load_twins()
    for i, r in twins.items():
        if i not in recs and r in recs and i in cat:
            recs[i] = dict(recs[r])
            src[i] = ("ai-twin", src[r][1], src[r][2])
    n_ai = len(recs)
    tmp = TAGS_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        for i, a in cat.items():
            r = recs.get(i)
            how = "ai" if r else "rules"
            if not r:
                r = rules_record(a)
            if how == "ai":
                r = fix_style(r, a)
            row = {"id": i, "name": r["name"], "kind": r["kind"], "kindOriginal": a["kind"] if r["kind"] != a["kind"] else None,
                   "desc": r["desc"], "style": r.get("style"), "view": r.get("view"), "roles": r.get("roles", []),
                   "tags": r["tags"], "use": r.get("use", ""), "source": how,
                   "styleAi": r.get("styleFixed"), "model": src.get(i, (None, None))[1], "sheet": src.get(i, (None, None, None))[2]}
            fh.write(json.dumps({k: v for k, v in row.items() if v not in (None, "")}, ensure_ascii=False) + "\n")
    os.replace(tmp, TAGS_FILE)
    print(f"sheet-number references rewritten to ids in {n_fixed} records")
    print(f"merged {len(cat)} assets: {n_ai} AI-tagged ({n_ai / len(cat):.1%}), {len(cat) - n_ai} rules-only -> {TAGS_FILE}")


def load_twins() -> dict:
    """vector-only twin id -> raster id with the same set/kind/name (written by build-index / tagging setup)."""
    p = os.path.join(WORK, "vector-twins.json")
    return json.load(open(p)) if os.path.exists(p) else {}


def cmd_status(args):
    sh = load_sheets()["sheets"]
    twins = load_twins()
    vis = [s for s in sh if not all(it["kind"] in AUDIO_KINDS for it in s["items"])
           and not all(it["id"] in twins for it in s["items"])]
    done = sum(1 for s in vis if is_done(s, False))
    calls = [json.loads(l) for l in open(CALLS)] if os.path.exists(CALLS) else []
    ok = [c for c in calls if c.get("ok")]
    cost = sum(c.get("cost", 0) or 0 for c in ok)
    ms = sum(c.get("ms", 0) or 0 for c in ok)
    fails = sum(1 for _ in open(FAILURES)) if os.path.exists(FAILURES) else 0
    print(f"sheets {done}/{len(vis)} done; calls {len(calls)} ({len(calls) - len(ok)} errored); "
          f"cost ${cost:.2f} (avg ${cost / max(1, len(ok)):.3f}); call time {ms / 3.6e6:.1f} h; failure records {fails}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["sheets", "audio", "merge", "status"])
    ap.add_argument("--model", default=os.environ.get("NK_TAG_MODEL", ""))
    ap.add_argument("--effort", default="low")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--redo", action="store_true")
    ap.add_argument("--redo-version", action="store_true")
    ap.add_argument("--shuffle", action="store_true")
    ap.add_argument("--timeout", type=float, default=600)
    ap.add_argument("--max-week", type=float, default=0.93)
    ap.add_argument("--max-5h", type=float, default=0.80)
    args = ap.parse_args()
    {"sheets": cmd_sheets, "audio": cmd_audio, "merge": cmd_merge, "status": cmd_status}[args.cmd](args)


if __name__ == "__main__":
    main()
