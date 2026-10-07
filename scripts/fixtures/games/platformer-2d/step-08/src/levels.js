// Levels. Level 1 is written as text (NK2D.asciiMap turns it into a Tiled map at runtime);
// level 2 is a Tiled JSON file (levels/level2.json, loaded by the manifest).
NK.def("levels", {
  1: {
    background: "background_color_hills",
    rows: [
      "                                                                          ",
      "                                                                          ",
      "                                                      c c c               ",
      "                              c c c                  =======              ",
      "                             =======                                      ",
      "                 c c c                     b                     c c      ",
      "                 =====           c c c                     X    =====     ",
      "        c c                     #######        c c c      XX              ",
      "  P     h    m      s      g    #######   ^^^  #######  s XXX  h  g    F  ",
      "###########################    ########  ##############  ###############  ",
      "###########################    ########  ##############  ###############  ",
      "###########################    ########  ##############  ###############  ",
    ],
    legend: {
      "#": { auto: "terrain_grass" },
      "=": { auto: "terrain_grass_cloud", oneWay: true },
      "X": { tile: "block_planks", solid: true },
      "^": { tile: "spikes", layer: "hazards" },
      "h": "bush", "m": "mushroom_red", "g": "grass",
      "c": { object: "coin" }, "P": { object: "player" }, "s": { object: "slime" },
      "k": { object: "spike-slime" }, "b": { object: "bee" }, "F": { object: "flag" },
    },
  },
  2: { tilemap: "level2", background: "background_color_mushrooms", last: true },
});
