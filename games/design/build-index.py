# Regenerates INDEX.json (genre aliases live here; token counts are measured from the files). Run: python3 build-index.py
import json, os, re
root = os.path.dirname(os.path.abspath(__file__))
def tok(p):
    s = open(os.path.join(root, p), encoding='utf-8').read()
    return -(-len(s) // 4)
G = [
 ("platformer", "Platformer (2D side view)", "phaser-2d",
  ["platformer","platform game","jump and run","jump n run","jump 'n' run","side scroller","side-scroller","sidescroller","mario","super mario","sonic","celeste","jump on enemies","stomp","2d jumping","jumping game"]),
 ("top-down-adventure", "Top-down action/adventure (Zelda-like)", "phaser-2d",
  ["zelda","zelda-like","action adventure","action-adventure","top-down adventure","top down adventure","dungeon","rpg","action rpg","arpg","hero quest","explore rooms","link to the past","pokemon"]),
 ("twin-stick-shooter", "Top-down shooter / twin-stick", "phaser-2d",
  ["twin-stick","twin stick","top-down shooter","top down shooter","arena shooter","survivors","vampire survivors","bullet heaven","zombie shooter","shoot zombies","tank game","tanks","geometry wars","brotato"]),
 ("shmup", "Shoot-'em-up (scrolling)", "phaser-2d",
  ["shmup","shoot em up","shoot 'em up","shoot-em-up","space shooter","spaceship","space invaders","galaga","bullet hell","scrolling shooter","vertical shooter","plane shooter","1942","r-type","asteroids"]),
 ("endless-runner", "Endless runner", "phaser-2d",
  ["endless runner","runner","infinite runner","auto runner","auto-runner","subway surfers","temple run","flappy","flappy bird","dino game","chrome dino","jetpack joyride","tap to fly","lane runner","crossy road"]),
 ("puzzle", "Puzzle (grid / sokoban / physics)", "phaser-2d",
  ["puzzle","sokoban","push boxes","box pushing","block puzzle","physics puzzle","angry birds","cut the rope","sliding puzzle","logic puzzle","tetris","2048","brain teaser","maze puzzle","pipe puzzle","laser puzzle"]),
 ("match-3", "Match-3", "phaser-2d",
  ["match-3","match 3","match three","candy crush","bejeweled","swap gems","gems","jewels","tile matching","connect three","matching game"]),
 ("tower-defence", "Tower defence", "phaser-2d",
  ["tower defence","tower defense","td","defend the base","place towers","kingdom rush","bloons","plants vs zombies","waves of enemies path"]),
 ("racing", "Racing (top-down and 3D arcade)", "either",
  ["racing","race","racer","kart","mario kart","car game","cars","drift","drifting","rally","f1","formula","micro machines","time trial","driving","motorbike","boat race"]),
 ("card-board", "Card and board games", "phaser-2d",
  ["card game","cards","solitaire","klondike","poker","blackjack","uno","deck","board game","chess","checkers","draughts","ludo","snakes and ladders","dominoes","dice game","yahtzee","tic tac toe","tic-tac-toe","connect four","memory cards","mahjong","go game","reversi","othello","backgammon"]),
 ("idle-clicker", "Idle / clicker", "phaser-2d",
  ["idle","idle game","clicker","incremental","cookie clicker","tap tycoon","tycoon","adventure capitalist","tapper","upgrade game","prestige"]),
 ("3d-action-collectathon", "3D third-person action / collectathon", "three-3d",
  ["3d platformer","collectathon","third person","third-person","3d adventure","3d action","mario 64","banjo","spyro","crash bandicoot","3d knight","3d explore","open world","3d character","3d hero","fall guys","obby"]),
 ("3d-first-person", "3D first-person (simple)", "three-3d",
  ["first person","first-person","fps","shooter 3d","3d shooter","doom","escape room","3d maze","walking simulator","shooting gallery","backrooms","exploration 3d"]),
 ("sports-arcade", "Sports / arcade (pong, breakout, pinball)", "phaser-2d",
  ["pong","breakout","arkanoid","brick breaker","pinball","air hockey","paddle","minigolf","mini golf","golf","basketball","soccer","football","penalty","bowling","table tennis","ping pong","tennis","hockey","billiards","pool game","sports"]),
 ("rhythm", "Rhythm", "phaser-2d",
  ["rhythm","rhythm game","music game","guitar hero","osu","dance","piano tiles","tap to the beat","beat saber","drum"]),
 ("metroidvania", "Metroidvania (lite)", "phaser-2d",
  ["metroidvania","metroid","castlevania","hollow knight","ori","ability gates","backtracking","interconnected map","explore and unlock abilities"]),
 ("roguelite", "Roguelite (lite)", "phaser-2d",
  ["roguelite","roguelike","dungeon crawler","rogue-like","rogue-lite","binding of isaac","hades","dead cells","permadeath","procedural dungeon","run-based","dungeon runs","random dungeon","enter the gungeon"]),
 ("survival-crafting", "Survival / crafting (lite)", "either",
  ["survival","crafting","craft","minecraft","don't starve","dont starve","gather resources","build a base","base building","hunger","stranded","island survival","terraria","valheim"]),
 ("cosy-sim", "Fishing / farming / cosy sim (lite)", "phaser-2d",
  ["farming","farm","stardew","harvest moon","fishing","cozy","cosy","relaxing","garden","gardening","animal crossing","life sim","plant crops","pet care","cafe","bakery"]),
 ("quiz-trivia", "Quiz / trivia", "phaser-2d",
  ["quiz","trivia","questions","pub quiz","general knowledge","who wants to be a millionaire","true or false","guess the flag","flag quiz","kahoot"]),
 ("word-game", "Word games", "phaser-2d",
  ["word game","wordle","word search","crossword","anagram","scrabble","boggle","hangman","spelling bee","letters","word puzzle","typing game","words"]),
 ("educational", "Educational mini-games", "phaser-2d",
  ["educational","education","learning","learn","kids","children","math","maths","arithmetic","times tables","spelling","alphabet","counting","geography","science","school","teach","preschool","flashcards","vocabulary"]),
]
genres = []
for gid, title, eng, aliases in G:
    f = f"genres/{gid}.md"
    assert os.path.exists(os.path.join(root, f)), f
    genres.append({"id": gid, "title": title, "file": f, "engine": eng, "tokens": tok(f), "aliases": aliases})
files = {p: tok(p) for p in ["CORE-RULES.md", "PLAYTEST-CHECKLIST.md", "README.md"]}
idx = {
  "version": 1,
  "tokenRule": "tokens = ceil(characters / 4)",
  "budgets": {"CORE-RULES.md": 1300, "genres/*.md": 700},
  "files": files,
  "matching": {
    "how": "lower-case the idea; for each genre count alias hits (whole word or phrase; a phrase of n words scores n); best score >= 1 wins; ties -> the genre listed first; none -> CORE-RULES only. Re-run on the brief's 'genre' string if the idea had no hit. Store the id with the game.",
    "engineHint": "genre.engine is the usual kit: 'phaser-2d', 'three-3d' or 'either' (decide by the idea/2D-3D choice)."
  },
  "genres": genres,
  "stepTypes": {
    "shell":   {"keywords": ["shell","config","empty","backdrop","setup","skeleton","boot"]},
    "assets":  {"keywords": ["assets","art","background","parallax","tileset","sprites","models"]},
    "level":   {"keywords": ["level","map","tiles","tilemap","world","room","arena","track","board","grid","dungeon","layout","course"]},
    "player":  {"keywords": ["player","hero","character","movement","controls","camera","ship","car","paddle"]},
    "pickups": {"keywords": ["pickup","pickups","coins","collectible","collectibles","items","hud","score","gems","stars"]},
    "enemies": {"keywords": ["enemy","enemies","hazard","hazards","spikes","lives","health","damage","game over","lose","boss","waves","obstacles"]},
    "goal":    {"keywords": ["goal","flag","win","finish","exit","more levels","next level","chest","victory"]},
    "polish":  {"keywords": ["polish","touch","mobile","juice","sound","sounds","music","particles","effects","menu"]},
    "order": "classify by the first matching type in this order: polish, enemies, goal, pickups, player, level, assets, shell (a step can be both; the later build stage wins)"
  },
  "stages": {
    "clarify":  {"include": []},
    "brief":    {"include": ["genre"]},
    "plan":     {"include": ["genre"]},
    "step":     {"include": ["CORE-RULES.md", "genre"], "placement": "system prompt, after ENGINE CARD, before STEP_RULES (stable prefix)"},
    "change":   {"include": ["CORE-RULES.md", "genre"]},
    "playtest": {"include": ["PLAYTEST-CHECKLIST.md", "genre"], "after": ["level", "enemies", "polish"],
                  "filter": "cumulative by [stages] tag: after level -> level+all; after enemies -> level+enemies+all; after polish -> every item (final pass). Automatic checks A1-A7 run in code first and are passed as results"}
  },
  "estimatedTokensPerCall": {}
}
core = files["CORE-RULES.md"]; mx = max(g["tokens"] for g in genres)
idx["estimatedTokensPerCall"] = {"brief": f"<= {mx}", "plan": f"<= {mx}", "step": f"<= {core + mx}", "change": f"<= {core + mx}", "playtest": f"<= {files['PLAYTEST-CHECKLIST.md'] + mx} (less when filtered)"}
open(os.path.join(root, "INDEX.json"), "w").write(json.dumps(idx, indent=1, ensure_ascii=False) + "\n")
print("ok", core, mx)
