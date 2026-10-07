"""Shared paths + catalog helpers for the tagging pass."""
from __future__ import annotations

import json
import os
import re

GAMES = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # the games/ folder
LIB = os.environ.get("NK_GAME_ASSETS") or os.path.join(GAMES, "library")
CATALOG = f"{LIB}/catalog.jsonl"
TAGS_DIR = f"{LIB}/_tags"            # per-sheet raw AI results (resumable)
TAGS_FILE = f"{LIB}/tags.jsonl"       # merged: one line per asset id
CARDS_DIR = f"{LIB}/_cards"
INDEX_DIR = f"{LIB}/_index"
_WORK = os.environ.get("NK_GAMES_WORK") or os.path.join(GAMES, "work")
SHEETS_DIR = os.path.join(_WORK, "sheets")
WORK = os.path.join(_WORK, "tagging")

KINDS = ["model", "sprite", "spritesheet", "animation", "tileset", "ui", "icon", "background",
         "texture", "font", "sfx", "music"]
STYLES = ["pixel-1bit", "pixel-8bit", "pixel-16bit", "flat-vector", "cartoon-hd", "hand-drawn", "sketch",
          "painterly", "realistic", "low-poly", "stylised-3d", "voxel", "n/a"]
VIEWS = ["side", "top-down", "three-quarter", "isometric", "front", "3d", "flat-ui", "n/a"]
ROLES = ["player", "enemy", "npc", "boss", "character-part", "vehicle", "weapon", "prop", "furniture",
         "collectible", "pickup", "powerup", "projectile", "hazard", "obstacle", "platform", "terrain", "tile",
         "wall", "floor", "roof", "door", "building", "structure", "road", "nature", "decoration", "background",
         "parallax-layer", "skybox", "texture", "material-swatch", "ui-button", "ui-panel", "ui-bar", "ui-element",
         "icon", "hud", "cursor", "crosshair", "input-prompt", "font-glyph", "font", "card", "board-piece",
         "vfx", "particle", "light-mask", "animation", "sfx-event", "music-loop", "jingle", "ambience", "voice"]


def load_catalog() -> dict:
    cat = {}
    with open(CATALOG, encoding="utf-8") as fh:
        for line in fh:
            a = json.loads(line)
            cat[a["id"]] = a
    return cat


def load_sheets() -> dict:
    with open(os.path.join(SHEETS_DIR, "sheets.json"), encoding="utf-8") as fh:
        return json.load(fh)


def set_of(asset_id: str) -> str:
    """Pack-level set = '<pack>/<first segment>' (e.g. kenney/nature-kit, kaykit/dungeon-pack)."""
    p = asset_id.split("/")
    return "/".join(p[:2])


def _r(x, n=2):
    return float(f"{x:.{n}f}") if isinstance(x, (int, float)) else x


def pivot_of(m: dict) -> str | None:
    bb = m.get("bbox")
    if not bb:
        return None
    mn, mx, sz = bb["min"], bb["max"], bb["size"]
    tol = lambda v, s: abs(v) <= max(0.02, 0.03 * s)
    ylab = "base" if tol(mn[1], sz[1]) else ("top" if tol(mx[1], sz[1]) else "mid")
    cx = tol((mn[0] + mx[0]) / 2, sz[0])
    cz = tol((mn[2] + mx[2]) / 2, sz[2])
    if cx and cz:
        xz = "centre"
    elif tol(mn[0], sz[0]) and tol(mn[2], sz[2]):
        xz = "corner(min x,z)"
    elif cx or cz:
        xz = "edge"
    else:
        xz = "offset"
    return f"{ylab}-{xz}"


def facts(a: dict) -> str:
    """Compact metric string used in prompts and search results."""
    m = a.get("metrics") or {}
    k = a["kind"]
    if k == "model":
        s = m.get("bbox", {}).get("size") or [0, 0, 0]
        out = f"{m.get('triangles', 0)} tris, {_r(s[0])}x{_r(s[1])}x{_r(s[2])} m (WxHxD)"
        pv = pivot_of(m)
        if pv:
            out += f", pivot {pv}"
        if m.get("rigged"):
            out += f", rigged {m.get('joints', 0)} joints"
        clips = m.get("clips") or []
        if clips:
            names = [c.get("name") if isinstance(c, dict) else str(c) for c in clips]
            out += f", {len(names)} clips: " + ",".join(names[:10]) + (",..." if len(names) > 10 else "")
        if m.get("skins"):
            out += f", skins {len(m['skins'])}"
        return out
    if k in ("sfx", "music"):
        return f"{m.get('duration', 0):.2f}s, {m.get('channels', 1)}ch"
    if k == "font":
        return f"font {m.get('family', '')} {m.get('style', '')}".strip()
    if k == "animation":
        return (f"{m.get('frames')} frames {m.get('frameWidth')}x{m.get('frameHeight')} px, "
                f"{m.get('suggestedFps')} fps, {m.get('layout', '')}")
    if k == "tileset":
        return (f"{m.get('width')}x{m.get('height')} px, tiles {m.get('tileWidth')}x{m.get('tileHeight')}"
                f" ({m.get('columns')}x{m.get('rows')}={m.get('tileCount')}), spacing {m.get('spacing')}")
    if k == "spritesheet":
        out = f"{m.get('width')}x{m.get('height')} px"
        if m.get("frames"):
            fn = m.get("frameNames") or []
            out += f", atlas {m['frames'] if isinstance(m['frames'], int) else len(m['frames'])} frames"
            if fn:
                out += ": " + ",".join(fn[:6]) + (",..." if len(fn) > 6 else "")
        g = m.get("grid")
        if g:
            out += f", grid {g.get('frameWidth')}x{g.get('frameHeight')} ({g.get('columns')}x{g.get('rows')})"
        return out
    out = f"{m.get('width')}x{m.get('height')} px"
    if m.get("vector"):
        out += ", vector"
    if isinstance(m.get("colors"), int) and m["colors"] <= 32:
        out += f", {m['colors']} colours"
    if m.get("skinFor"):
        out += f", skin for {m['skinFor']}"
    return out


def slug_words(s: str) -> list[str]:
    return [w for w in re.split(r"[^a-z0-9]+", s.lower()) if w]
