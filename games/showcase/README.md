# Example games

Complete games made on the Game Studio's engine kits and the CC0 asset library. Each folder is
a game exactly as the studio stores one: `game.json`, `index.html`, `assets.lock.json` (every
asset it uses, all CC0) and `src/`. `README.md` and `spec.md` explain how it was designed.

| Folder | Game | Kit | Assets |
|---|---|---|---:|
| `dungeon/` | Vault of Embers | three-3d@1.1.0 | 81 |
| `mars-base/` | Red Horizon | three-3d@1.1.0 | 56 |
| `medieval-village/` | Hearthvale | three-3d@1.1.0 | 85 |

Play one on this computer (needs the asset library, see docs/games.md):

```
node games/showcase/serve.mjs dungeon
```

Only the final screenshots are included. The development scripts, review and play-test
captures and reference pictures the READMEs mention are not.
