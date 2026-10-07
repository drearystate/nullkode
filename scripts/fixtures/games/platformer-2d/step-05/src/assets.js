// Everything the game loads, by asset-library id, plus sprite animations from the atlases.
NK.assets.define({
  tiles: "kenney/new-platformer-pack/spritesheet-tiles",
  chars: "kenney/new-platformer-pack/spritesheet-characters",
  enemies: "kenney/new-platformer-pack/spritesheet-enemies",
  bg: "kenney/new-platformer-pack/spritesheet-backgrounds",
  jump: "kenney/new-platformer-pack/sounds/sfx-jump",
  coin: "kenney/new-platformer-pack/sounds/sfx-coin",
  hurt: "kenney/new-platformer-pack/sounds/sfx-hurt",
  stomp: "kenney/new-platformer-pack/sounds/sfx-bump",
  win: "kenney/new-platformer-pack/sounds/sfx-magic",
  "ui-click": "kenney/interface-sounds/click-001",
  music: "kenney/music-loops/loops/flowing-rocks",
});

NK2D.anims({
  "hero-idle": { atlas: "chars", frames: ["character_green_idle"] },
  "hero-walk": { atlas: "chars", frames: ["character_green_walk_a", "character_green_walk_b"], fps: 10 },
  "hero-jump": { atlas: "chars", frames: ["character_green_jump"] },
  "hero-hit": { atlas: "chars", frames: ["character_green_hit"] },
  "slime-walk": { atlas: "enemies", frames: ["slime_normal_walk_a", "slime_normal_walk_b"], fps: 4 },
  "spike-walk": { atlas: "enemies", frames: ["slime_spike_walk_a", "slime_spike_walk_b"], fps: 4 },
  "bee-fly": { atlas: "enemies", frames: ["bee_a", "bee_b"], fps: 14 },
  "coin-spin": { atlas: "tiles", frames: ["coin_gold", "coin_gold_side"], fps: 5 },
  "flag-wave": { atlas: "tiles", frames: ["flag_green_a", "flag_green_b"], fps: 6 },
});
