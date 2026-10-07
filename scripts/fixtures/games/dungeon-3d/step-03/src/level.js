// The crypt: layout data + a builder shared by the menu backdrop and the play scene.
// Units are the KayKit pack's (floor tile = 4, wall = 4 high, knight ≈ 2.5 tall).
NK.def("dungeon", {
  half: 14, // room is 28 × 28
  start: [0, 0, 6],
  pillars: [[-6, -6], [6, -6], [-6, 6], [6, 6]],
  crates: [[-10, -2, 0.4]],                       // fixed, climbable (x, z, rotY)
  boxes: [[-10.5, 3.5], [-8.6, 3.5]],             // fixed steps
  barrels: [[3, 3], [4.6, 3.6], [3.8, 5.2]],      // dynamic, pushable
  coins: [[0, 4, 1], [-6, 0, 1], [6, 0, 1], [9, 9, 1], [-10, -2, 3.2], [-9.6, 3.5, 2.6], [10, -9, 1], [-10, -10, 1]],
  chest: [0, -11.2],
  torches: [[-8, -13.4, 0], [8, -13.4, 0], [-13.4, 2, Math.PI / 2], [13.4, 2, -Math.PI / 2]],
  banners: [[-4, -13.4, 0], [4, -13.4, 0]],
  skeleton: { at: [8, -4], path: [[8, -4], [-8, -4], [-8, 8], [8, 8]] },
});

NK.def("buildDungeon", function (scene) {
  const T = THREE, d = NK.use("dungeon"), h = d.half;
  // Floor: 49 tiles as one instanced mesh per material + one flat collider.
  const tiles = [];
  for (let x = -h + 2; x < h; x += 4) for (let z = -h + 2; z < h; z += 4) tiles.push([x, 0, z, 0]);
  NK3D.instances(scene, "floor", tiles, { castShadow: false });
  const ground = new T.Object3D();
  ground.position.set(0, -0.5, 0);
  scene.add(ground);
  scene.body(ground, { type: "fixed", size: [h * 2, 1, h * 2] });
  // Walls (instanced, one box collider each).
  const walls = [];
  for (let x = -h + 2; x < h; x += 4) { walls.push([x, 0, -h, 0]); walls.push([x, 0, h, Math.PI]); }
  for (let z = -h + 2; z < h; z += 4) { walls.push([-h, 0, z, Math.PI / 2]); walls.push([h, 0, z, -Math.PI / 2]); }
  NK3D.instances(scene, "wall", walls, { physics: "fixed" });
  // Pillars, climbable crates and box steps.
  d.pillars.forEach(([x, z]) => { const p = scene.add(NK3D.model("pillar", { position: [x, 0, z] })); scene.body(p, { type: "fixed" }); });
  d.crates.forEach(([x, z, r]) => { const c = scene.add(NK3D.model("crates", { position: [x, 0, z], rotationY: r })); scene.body(c, { type: "fixed", shape: "convex" }); });
  d.boxes.forEach(([x, z]) => { const b = scene.add(NK3D.model("box", { position: [x, 0, z] })); scene.body(b, { type: "fixed" }); });
  // Wall torches with flickering warm lights, and banners.
  const lights = [];
  d.torches.forEach(([x, z, r]) => {
    const t = scene.add(NK3D.model("torch", { position: [x, 2.6, z], rotationY: r, shadows: false }));
    const l = new T.PointLight(0xff9a3c, 18, 12, 1.6);
    l.position.set(x + Math.sin(r) * 0.9, 3.6, z + Math.cos(r) * 0.9);
    scene.add(l);
    lights.push({ l, seed: Math.random() * 10 });
    void t;
  });
  d.banners.forEach(([x, z, r]) => scene.add(NK3D.model("banner", { position: [x, 0, z], rotationY: r, shadows: false })));
  scene.add({ update(dt) { const t = performance.now() / 1000; for (const f of lights) f.l.intensity = 16 + Math.sin(t * 9 + f.seed) * 2 + Math.sin(t * 23 + f.seed * 3) * 1.5; } });
  // Candles on the chest dais.
  [[-1.6, -12.6], [1.6, -12.6]].forEach(([x, z]) => scene.add(NK3D.model("candle", { position: [x, 0, z], shadows: false })));
  return { d };
});
