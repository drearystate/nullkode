// The village layout (pure data; plain JSON inside NK.def so tools/plan.py can read it too).
// Cells are [col, row] on the flat-top hex grid (src/hex.js): x = col * 1.732, z = 2 * row (+1 on odd columns).
// Screen: west (river) on the left, east (windmill + fields) on the right, north at the top.
// face: the direction a building's front looks at, 0..5 = 30°, 90° (south, towards the camera), 150°, 210°, 270°, 330°.
// squareProps: [asset, x, z, rotationDeg, scale] placed by hand on the square (world metres).
NK.def("level", {
  "seed": 1207,
  "bounds": { "c0": -19, "c1": 16, "r0": -14, "r1": 13 },
  "camera": { "target": [-1.5, 0.5], "yaw": -18, "pitch": 40, "width": 24, "minWidth": 11, "maxWidth": 32, "pan": [10, 8] },
  "village": { "center": [-1.6, 0.2], "radius": 9.6, "stretch": 1.3 },
  "plaza": [[-1, -1], [-2, -1], [0, -1], [-1, 0], [0, 0]],
  "river": [[-5, -15], [-6, -11], [-6, -6], [-4, -1], [-4, 1], [-6, 4], [-8, 8], [-9, 14]],
  "roads": [
    { "name": "west", "points": [[-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, -1], [-6, -1]] },
    { "name": "east", "points": [[0, 0], [1, 0], [2, 0], [3, -1]] },
    { "name": "south", "points": [[-1, 0], [-1, 1], [-2, 2], [-3, 2]] }
  ],
  "bridges": [{ "at": [-4, 0], "axis": 0 }],
  "fields": [[3, 0], [4, 0], [5, 0], [4, 1]],
  "buildings": [
    { "type": "townhall", "at": [-1, -2], "face": 1 },
    { "type": "house", "at": [1, -1], "face": 2, "model": "home-b" },
    { "type": "market", "at": [-2, -1], "face": 0 },
    { "type": "well", "at": [-1, -1], "face": 1 },
    { "type": "windmill", "at": [4, -1], "face": 1 },
    { "type": "stables", "at": [5, -1], "face": 2 },
    { "type": "lumber", "at": [-7, -1], "face": 0 },
    { "type": "blacksmith", "at": [2, -2], "face": 2 },
    { "type": "house", "at": [1, -2], "face": 2, "model": "home-b" },
    { "type": "house", "at": [1, -3], "face": 1, "model": "home" },
    { "type": "house", "at": [2, -3], "face": 2, "model": "home" },
    { "type": "house", "at": [-2, -2], "face": 1, "model": "home" },
    { "type": "house", "at": [-3, -2], "face": 0, "model": "home-b" },
    { "type": "house", "at": [0, 1], "face": 4, "model": "home" },
    { "type": "house", "at": [1, 1], "face": 3, "model": "home-b" },
    { "type": "house", "at": [-2, 1], "face": 0, "model": "home" },
    { "type": "house", "at": [-2, 3], "face": 4, "model": "home-b" }
  ],
  "docks": [{ "at": [-3, 2], "face": 3 }],
  "groves": [[[3, -4], 3], [[-1, -4], 2], [[2, 2], 1], [[-3, -3], 2], [[6, 1], 2], [[-6, 1], 3], [[-6, -2], 2], [[0, 4], 2]],
  "gardens": [[1, 2, 0], [2, -4, 30], [-3, -1, 90]],
  "scenery": [
    ["haybale", 3.6, 4.2, 20, 1], ["haybale", 4.2, 4.6, 70, 1], ["haybale", 3.9, 5.1, 35, 0.9], ["wheelbarrow", 3.0, 4.8, 130, 1],
    ["bench", 2.1, 1.9, 200, 1], ["sack", 9.6, -0.2, 10, 1.2], ["sack", 9.8, 0.05, 60, 1.2],
    ["lumber", -9.6, -2.4, 30, 1.3], ["lumber", -10.3, 0.6, 60, 1], ["stump", -9.2, 1.4, 0, 1], ["stump", -11.2, -2.6, 0, 1.1]
  ],
  "squareProps": [
    ["cart", 0.3, -1.55, 150, 0.85], ["horse", 0.85, -2.3, 150, 0.9], ["bench", 0.55, -1.15, 120, 1], ["bench", -2.3, 0.35, 30, 1],
    ["crate", -0.15, -0.45, 10, 1], ["barrel", 0.25, -0.2, 0, 1], ["berry-basket", -2.75, -0.55, 0, 1]
  ]
});
