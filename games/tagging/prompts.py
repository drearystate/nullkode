"""Prompts for the tagging pass. Bump PROMPT_VERSION when the prompt or schema changes
(sheets tagged with an older version are re-run only with --redo-version)."""
from common import KINDS, STYLES, VIEWS, ROLES

PROMPT_VERSION = 5

SHEET_SYSTEM = """You catalogue a game-asset library so that an AI game builder can find and use the right assets.
You get ONE contact sheet: a 6x5 grid of numbered previews (number in the top-left of each cell, read left-to-right,
top-to-bottom; checkerboard = transparency). 3D models are shown as an orthographic 3/4 render; sprites, icons and
textures at their own pixels scaled to fit; a waveform means audio. You also get the facts the importer already knows
for each number (id, kind, size/frames/tris/clips/duration, source folder). Folder names are reliable context
(pack, theme, colour variant); file names are often meaningless numbers (tile-0107), so LOOK at the picture.

Return ONLY a JSON object, no prose, no markdown fence. Put what the whole sheet shares in "common" ONCE, and only
item-specific information in each item (this keeps the reply short):
{{"common":{{"style":"...","view":"...","roles":["..."],"tags":["..."],"use":"..."}},
 "items":[{{"n":1,"name":"...","desc":"...","tags":["..."]}}, ...]}}
One item for EVERY number listed in the facts, in order. An item may add "kind", "style", "view", "roles" or "use" ONLY
when it differs from "common" (e.g. one character among tiles, a different usage).

Fields:
- name: short human name, 2-6 words, specific and distinguishing within the sheet (include the variant: colour,
  size, state, direction, letter/digit), e.g. "Pine tree, large", "Grass tile with flowers", "Letter L tile", "Red
  sports car", "Knight, idle frame", "Stone wall corner (outer)". No file-name noise ("tile 0107").
- kind: one of {kinds}. Only give it when the given kind is clearly wrong (a full scenic image marked
  sprite -> background; a seamless surface swatch -> texture; a small symbolic pictogram -> icon; a button/panel/bar
  -> ui; a grid of frames -> spritesheet). Never change model/sfx/music/font/animation/tileset.
- desc: ONE short sentence (max 15 words): what it depicts (subject, look, notable details, main colours).
- style: one of {styles}. pixel-8bit = visible pixel art in colour (any small palette); pixel-1bit = one colour +
  transparency/black; flat-vector = clean flat shapes, no visible pixels; cartoon-hd = smooth raster cartoon with
  shading/outlines; low-poly = faceted 3D flat colours; stylised-3d = smooth/textured 3D cartoon; voxel = cube-built.
- view: one of {views}. side = side-scroller/platformer profile; top-down = straight down; three-quarter = top-down
  RPG with visible fronts; isometric = 2:1 diamond projection (2D); 3d = any 3D model; flat-ui = UI/icons/fonts;
  front = facing the camera (cards, portraits).
- roles: 1-4 from {roles}. What a game would use it AS.
- tags (lowercase, single words or hyphenated, no pack names): common.tags = 5-10 words true for ALL items (theme/
  setting, genre fit, style/perspective words, role words); item tags = 4-10 words specific to that item (objects shown
  + synonyms people would search, e.g. coin/money/gold, sword/blade/weapon; main colours; state/direction; mood).
  Never repeat common tags in items.
- use: one short practical note for a game developer: how it is used and combined, e.g. "16 px floor tile; paint
  on a grid, overlay detail tiles", "Pickup: spin + bob, play coin sfx on touch", "8-frame run cycle, ~12 fps, faces
  right (flipX for left)", "Seamless texture, repeat on ground", "9-slice panel, keep corners", "Modular wall piece,
  4 m grid, pivot base centre; snap with floor-* tiles". Use the given facts (size in metres, pivot, frames, clips)
  when they matter. Give common.use for the shared usage and an item "use" only where it differs or adds something
  (which edge/corner it is, what it pairs with). NEVER refer to the numbers of this sheet (they mean nothing outside
  it): name other pieces by their id as given after the prefix, e.g. "pair with chest-lid-blue", "ends: tile-0013,
  tile-0016", "cycle tile-0023 to tile-0028".

Be accurate about what you SEE; if a preview is blank or unreadable, still return the item using the facts, with a
tag "unclear-preview"."""
SHEET_SYSTEM = SHEET_SYSTEM.format(kinds=", ".join(KINDS), styles=", ".join(STYLES), views=", ".join(VIEWS),
                                   roles=", ".join(ROLES))


AUDIO_SYSTEM = f"""You catalogue game audio clips so that an AI game builder can find the right sound. You get a list
of clips: number, id (pack/folder/name), kind (sfx or music) and duration. You cannot hear them; infer from the
folder and file names (they are descriptive: e.g. footstep-gravel-1, laser-small-002, jingles-hit-15,
impact-metal-heavy-003, Kenney "interface sounds" = UI clicks). Return ONLY JSON, no prose:
{{"items":[{{"n":1,"name":"...","kind":"sfx|music","desc":"...","roles":["..."],"tags":["..."],"use":"..."}}, ...]}}
- name: short human name ("Footstep on gravel 1", "Small laser shot 2", "Win jingle 15").
- kind: sfx or music (short stingers/jingles <5 s are music only if they are musical; keep the given kind unless wrong).
- desc: one sentence: what the sound is and its character (short/long, soft/harsh, retro/realistic) from name+duration.
- roles: 1-3 from: sfx-event, music-loop, jingle, ambience, voice, ui-element.
- tags: 8-16 lowercase search words: the sound event and synonyms (click/tap/press, hit/impact/punch, coin/pickup/
  collect, explosion/boom, jump, laser/shoot/blaster, footstep/step/walk, door, powerup, win/victory, lose/fail/game-over,
  error/negative, confirm/select/positive...), material/source, game situations (ui, menu, pickup, combat, movement),
  genre fit (retro/8-bit/chiptune if the folder says so, sci-fi, fantasy...), mood, length word (short/long/loop).
- use: one practical note: when to play it ("play on coin pickup; vary rate 0.9-1.1"; "loopable background music
  for menus" only if the name/folder says loop or it is long music; "one-shot stinger on level complete")."""
