# Third-party notices: Game Studio

Everything in `games/` is part of NullKode and under its MIT licence (`LICENSE`
at the top of the project), except the third-party files listed here. Their
licences allow you to use, change and share them, including in commercial
games, as long as their notices stay with them.

## Engine kits (`games/engine/kits/`)

| What | Where in each kit version | Licence | Licence text |
|---|---|---|---|
| Phaser 4 (Richard Davey, Phaser Studio Inc.) | `phaser-2d/<version>/phaser.min.js` | MIT | `phaser-2d/<version>/licenses/phaser-LICENSE.md` |
| three.js (three.js authors) | bundled in `three-3d/<version>/nk-three.min.js` | MIT | `three-3d/<version>/licenses/three-LICENSE` |
| Rapier physics, `@dimforge/rapier3d-compat` (Dimforge) | `three-3d/<version>/rapier.min.js` | Apache-2.0 | `three-3d/<version>/licenses/rapier-LICENSE` |
| Draco 3D decoder (Google), copy from three.js | `three-3d/<version>/decoders/draco/` | Apache-2.0 | Same Apache-2.0 text as `rapier-LICENSE` |
| Basis Universal transcoder (Binomial LLC), copy from three.js | `three-3d/<version>/decoders/basis/` | Apache-2.0 | Same Apache-2.0 text as `rapier-LICENSE` |
| meshoptimizer decoder (Arseny Kapoulkine), copy from three.js | bundled in `nk-three.min.js` | MIT | Below |
| ktx-parse and zstddec (Don McCurdy), copies from three.js | bundled in `nk-three.min.js` | MIT | Below |
| Kenney Future font (Kenney, www.kenney.nl) | `*/<version>/fonts/kenney-future.ttf` | CC0 1.0 (public domain) | No conditions |

The NullKode game runtime (`nk-game.min.js`, `nk-game-2d.min.js`, the kit code
in `nk-three.min.js`, `src/` and `template/`) is NullKode's own code (MIT).

MIT licence text for meshoptimizer ("Copyright (C) 2016-2026, by Arseny
Kapoulkine") and for ktx-parse and zstddec ("Copyright (c) Don McCurdy"):

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Game assets

No asset files are included. You download the packs yourself (see
`docs/games.md`). All four publishers' packs used here are CC0 1.0 (public
domain): free for any use, credit appreciated but not required.

- Kenney: www.kenney.nl (packs at kenney.nl/assets)
- KayKit by Kay Lousberg: www.kaylousberg.com (packs at kaylousberg.itch.io)
- Quaternius: quaternius.com (packs at quaternius.com)
- Pixel Frog: pixelfrog-assets.itch.io (Pixel Adventure 1 and 2, Kings and
  Pigs, Treasure Hunters, Pirate Bomb)

Only packs released as CC0 are covered. Some publishers release other packs
under licences that allow using them in games but not sharing the files;
`games/ingest/prepare-packs.py` leaves those out.

`games/metadata/` holds descriptions, tags and set cards for those assets,
written by AI for NullKode. They are under NullKode's MIT licence.

## Pipeline tools

`games/ingest`, `games/tagging` and `games/tools` install their npm packages
from their own `package.json` files (`npm ci`); each package keeps its own
licence in `node_modules`. The ingest pipeline also runs Blender (GPL), ffmpeg
(LGPL/GPL), Python, Pillow and numpy, which you install yourself; none of them
are included.
