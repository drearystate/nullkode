// Level data: the whole colony layout, in metres (Y up). Edit positions here; code only reads this.
// World axes: the base spine runs along +X; the camera looks from +Z/+X (yaw 28 deg), so +X goes right-down on screen.
// Every piece: [assetKey, x, z, rotY (deg), scale] (+ optional y). Scale normalisation: KayKit pieces x3.4
// (a module door is about 2 m), Kenney Space Kit pieces by target height, people 1.8 m tall.
NK.def("level", {
  seed: 7,
  bounds: { minX: -34, maxX: 34, minZ: -34, maxZ: 28 },   // camera target limits
  buildRadius: 30,                                          // build zone around the hub
  camera: { target: [0.5, 3.5], yaw: 28, pitch: 33, dist: 86, minDist: 38, maxDist: 110 },

  // --- terrain: craters are carved into the ground mesh; flat pads keep building sites level
  craters: [
    { x: -1.5, z: 15.5, r: 6.6, depth: 1.5 },
    { x: 3, z: -41, r: 8.5, depth: 1.8 },
    { x: -30, z: -26, r: 3.6, depth: 0.8 },
    { x: 27, z: 16, r: 3.2, depth: 0.7 },
    { x: -36, z: 9, r: 4.2, depth: 0.9 },
    { x: 31, z: -31, r: 4.5, depth: 0.9 },
    { x: -14, z: 27, r: 3.0, depth: 0.6 },
    { x: 14, z: -48, r: 3.5, depth: 0.7 },
    { x: -46, z: -10, r: 5.5, depth: 1.0 },
    { x: 40, z: 2, r: 4.0, depth: 0.8 },
  ],
  flats: [ // [x, z, radius]: ground flattened under the base
    [-3, -6, 9], [-17, -6, 9], [10, -7, 7], [18, -7, 6], [-15, 10, 10], [10, -20, 13], [-6, -19, 6], [-18, -17, 5],
  ],

  // --- the colony (static set pieces)
  base: {
    hub: { x: -3, z: -6, scale: 3.9, variant: "navy" },   // atlas swap: gold dome/band → navy (reference palette)
    spine: [ // modules west → east, joined by tunnels
      { kind: "module", key: "mod-carriage", x: -17.5, z: -6, rot: 90 },
      { kind: "module", key: "mod-command", x: -24.6, z: -6, rot: -90 },
      { kind: "tunnel", x: -10.6, z: -6, len: 1 },
      { kind: "tunnel", x: 4.6, z: -6.6, len: 1 },
      { kind: "module", key: "mod-carriage", x: 10.5, z: -7, rot: -90 },
      { kind: "tunnel", x: 15.2, z: -7, len: 0.55 },
      { kind: "greenhouse", x: 20.4, z: -7 },
    ],
    dish: { x: -17.5, z: -18, rot: 35, height: 7.4 },
    tanks: [{ x: -8.2, z: -18.5 }, { x: -4.4, z: -19.2 }],
    generator: { x: -0.5, z: -18.6, rot: -20 },
    battery: { x: 25.5, z: -11.5, rot: -30 },
    pad: { x: -15.5, z: 10.5, rot: 22.5 },
    lamps: [[-24.6, 6.9], [-24.4, 14.6], [-6.6, 6.6], [-6.4, 14.4]],
  },

  // --- power: existing solar arrays along the cable; the socket is the missing link (objective 1)
  solar: {
    arrays: [{ x: 4.5, z: -22.5, rot: -8 }, { x: 10.5, z: -23, rot: -8 }, { x: 16.5, z: -21.5, rot: -8 }],
    socket: { x: 22.6, z: -18.6, rot: -8 },
    cable: [[-0.5, -18.6], [4, -19.4], [10, -19.6], [16, -18.4], [20.6, -16.4], [23.4, -14.4], [25.5, -11.5], [22.6, -8.6], [20.4, -7]],
    socketCable: [[22.6, -18.6], [21.8, -17.2]],
  },

  // --- props in functional groups
  props: [
    // supplies by the pad
    ["crates-a", -8.6, 2.4, 15, 3.0], ["crate-b", -6.4, 3.2, -10, 3.0], ["crate-a", -7.6, 4.4, 30, 3.0],
    // supplies by the habitat door
    ["crates-b", -13.6, -1.6, 0, 2.6], ["barrels-blue", -11.3, -1.0, 0, 3.0],
    // by the dish + tanks
    ["crate-b", -14.2, -15.5, 25, 2.6], ["barrels-yellow", -11.4, -16.0, 0, 3.0],
    // by the greenhouse / lab
    ["barrels-blue", 14.6, -2.6, 0, 3.0], ["crate-a", 16.6, -2.8, 20, 2.6],
    // by the generator
    ["crate-b", 2.4, -16.2, 10, 2.4],
  ],
  people: [
    { x: -11.8, z: 0.4, rot: 200, anim: "idle" },
    { x: 1.8, z: -0.6, rot: 150, anim: "walk", patrol: [[1.8, -0.6], [-0.8, 3.5], [3.5, 2.6]] },
  ],

  // --- rover + crystal deposit (the gathering route)
  rover: { x: 4.5, z: 9.5, rot: 80 },
  deposit: { x: 20.5, z: 8, r: 5, trip: 40 },
  // deposit = slate boulders (KayKit forest, colour 4) + cyan crystal shards (Kenney TD crystal, recoloured)
  depositRocks: [["slate-a", 20.4, 7.7, 20, 1.45], ["slate-b", 22.9, 9.4, -40, 1.1], ["slate-c", 18.3, 9.1, 70, 0.95],
    ["slate-b", 22.2, 5.9, 140, 0.85], ["slate-a", 24.4, 7.5, -110, 0.8], ["slate-c", 19.0, 6.0, 10, 0.7]],
  depositShards: { count: 14, spread: 3.6, minScale: 4.5, maxScale: 8 },

  // --- framing rocks (big forms at the edges; foreground ones frame without covering play)
  // KayKit forest boulders are about 2.6 m wide at scale 1.
  boulders: [
    ["boulder-a", -9, 27, 20, 3.2], ["boulder-b", -15, 26, 0, 2.2], ["boulder-d", -21, 31, 45, 3.0],
    ["boulder-a", -26, 24, 0, 1.4],
    ["boulder-b", -40, -3, 10, 2.8], ["boulder-d", -42, 5, 60, 2.4], ["boulder-a", -38, -12, 0, 2.0],
    ["boulder-c", -33, -22, 30, 1.9], ["boulder-e", -26, -34, 0, 2.4], ["boulder-a", -44, -24, 0, 2.6],
    ["boulder-b", 22, -37, 40, 2.2], ["boulder-c", 29, -25, 15, 1.7], ["boulder-d", 35, -13, 70, 2.2],
    ["boulder-a", 32, 8, 20, 1.9], ["boulder-e", 27, 22, 50, 2.4], ["boulder-b", 18, 27, 90, 2.6], ["boulder-c", 38, -2, 0, 2.6],
    ["boulder-a", -6, -36, 0, 1.6], ["boulder-d", 10, -40, 0, 1.5], ["boulder-e", -18, -42, 0, 2.2],
  ],
  scatter: { count: 1100, radius: 75, keepOut: 2.0, rocks: 240 },

  // --- buildable structures (toolbar order = hotkeys 1-5); their models are composed in src/entities/buildings.js
  buildings: [
    { id: "habitat", name: "Habitat", radius: 3.6, cost: { crystals: 60, energy: 20 }, info: "Houses new crew" },
    { id: "solar", name: "Solar Panel", radius: 2.4, cost: { crystals: 30 }, info: "+2 energy every 5 s once wired" },
    { id: "oxygen", name: "Oxygen Tank", radius: 2.0, cost: { crystals: 40, water: 20 }, info: "Stores breathable air" },
    { id: "storage", name: "Storage", radius: 3.0, cost: { crystals: 25 }, info: "+100 storage for each resource" },
    { id: "defense", name: "Defense", radius: 1.8, cost: { crystals: 50, energy: 15 }, info: "Shoots down meteors for crystals" },
  ],
  objectives: [
    { id: "power", text: "Connect solar power", hint: "Solar Panel on the glowing socket" },
    { id: "rover", text: "Gather crystals with the rover", hint: "Tap the rover, then the crystals" },
    { id: "oxygen", text: "Build an Oxygen Tank", hint: "Place one near the base" },
    { id: "habitat", text: "Build a Habitat for new crew", hint: "Place one near the base" },
  ],
  economy: { tick: 5, solPeriod: 40, solarPerTick: 2, waterPerTick: 1, cap: 300, capPerStorage: 100, meteorEvery: 55 },
});
