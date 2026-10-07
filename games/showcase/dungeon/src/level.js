// The flooded hall, floor 03: hand-placed layout data + one builder shared by the menu backdrop and the play scene.
// Units are the KayKit pack's: floor tiles 2 m, wall modules 4 × 4 m, knight ≈ 2.5 m. North = −z (the vault wall),
// west = −x (the culvert portcullis). Far walls (north, west) are 8 m tall; near walls (south, east) are low
// parapets so they frame the isometric view without hiding play. The distances copy the reference: from the
// fighting spot (0, 0) the chest is ~6.5 m north, the bridge ~4 m south, the portcullis ~10 m west.
// Nothing is random except the seeded floor-tile variation.
NK.def("level", {
  start: [0, 0, 9.4],
  mageStart: [-2.4, 0, 10.1],
  // wall faces: north z=-7.5 · inner west x=-6.5 (z<-0.5) · step z=-0.5 · west x=-10 · east parapet x=9 · south parapet z=12
  faces: { north: -7.5, innerWest: -6.5, step: -0.5, west: -10, east: 9, south: 12 },
  channel: { z0: 2, z1: 6, bridge: [-2, 2], water: -0.75 },
  vault: { x: 0, chest: [0, 0.6, -6.45] },
  // lower-tier wall modules: [key, x, z, rotY]
  walls: [
    ["wall-pillar", -4.5, -8, 0], ["wall", 4.5, -8, 0], ["wall-pillar", 8.5, -8, 0],
    ["wall", -7, -5.5, Math.PI / 2], ["wall-pillar", -7, -1.5, Math.PI / 2],
    ["wall", -8.5, -1, 0],
    ["wall", -10.5, 0, Math.PI / 2], ["wall-gated", -10.5, 4, Math.PI / 2], ["wall-pillar", -10.5, 8, Math.PI / 2], ["wall", -10.5, 12, Math.PI / 2],
  ],
  pillars: [[-7.05, -8.05], [-6.75, -0.75]],
  // wall torches: [x, y, z, rotY] (rotY = the way the torch faces)
  torches: [
    [-2.95, 2.5, -7.5, 0], [2.95, 2.5, -7.5, 0], [6.6, 2.5, -7.5, 0],
    [-6.5, 2.5, -4.2, Math.PI / 2], [-8.5, 2.5, -0.5, 0], [-6.75, 2.5, 0.0, 0],
    [-10, 2.5, 1.35, Math.PI / 2], [-10, 2.5, 6.65, Math.PI / 2], [-10, 2.5, 10.2, Math.PI / 2],
    [8.8, 1.7, -2.6, -Math.PI / 2], [8.8, 1.7, 9.2, -Math.PI / 2], [-5.6, 1.7, 12.2, Math.PI], [4.6, 1.7, 12.2, Math.PI],
  ],
  banners: [["banner-vault", -4.5, -7.5, 0], ["banner-vault", 4.5, -7.5, 0]],
  // props: [key, x, z, rotY, scale?]. Grouped by function: stores against walls, the guard post's gear, remains.
  props: [
    // stores against the inner west wall (top centre of the view)
    ["crates", -5.3, -6.2, 0.25], ["barrel", -5.4, -3.9, 0], ["box-large", -5.5, -1.85, 0.4], ["barrel-small", -4.25, -5.0, 0],
    // the step corner on the north bank
    ["bucket", -9.1, 0.65, 0], ["box-small", -7.8, 0.45, 0.3],
    // south-west bank
    ["box-large", -8.7, 8.3, -0.2], ["crate-open", -6.7, 8.9, 0.1], ["barrel", -8.8, 10.6, 0], ["barrel-stack", -4.4, 11.4, 0.3],
    // the east guard post: stores by the rack
    ["barrel", 7.9, -4.4, 0], ["box-large", 8.0, -2.2, 0.2], ["barrel-small", 6.8, -3.3, 0], ["keg", 7.9, 0.3, -Math.PI / 2],
    // south-east corner (foreground right)
    ["crates", 7.7, 10.3, -0.3], ["box-small", 6.0, 11.0, 0.5], ["bucket", 4.9, 10.7, 0],
    // remains by the step corner (decor only, never in the path)
    ["skull", -5.7, 0.35, 0.8, 0.6], ["bones", -5.0, -0.25, 1.9],
  ],
  rack: { x: 8.4, z: -6.1 },
  lantern: [11.2, 5.0, -3.6], // hanging cage-lantern beyond the east parapet (foreground right)
  guards: { warrior: [2.2, 0, -2.6], archer: [4.2, 0, -4.6] },
  bounds: { x: [-3.5, 4.5], z: [-3, 8] }, // camera focus limits
  // minimap: this hall + the corridors beyond the gates and the stair we came down
  map: {
    rooms: [[-6.5, -7.5, 15.5, 7], [-10, -0.5, 19, 12.5], [-2.5, -11.5, 5, 4]],
    corridors: [[-18, 2, 8, 4], [-22, -10, 4, 16], [-22, -14, 14, 4], [-2, 12, 4, 6], [-10, 16, 12, 3], [9, -5, 6, 3]],
  },
});

NK.def("buildLevel", function (scene) {
  const T = THREE, L = NK.use("level"), Look = NK.use("Look"), F = L.faces, ch = L.channel, V = L.vault;
  Look.prepare();
  NK.rng.seed(3);
  const solid = (x, y, z, sx, sy, sz) => { const o = new T.Object3D(); o.position.set(x, y, z); scene.add(o); scene.body(o, { type: "fixed", size: [sx, sy, sz] }); };
  const place = (key, x, y, z, r, o) => scene.add(NK3D.model(key, Object.assign({ position: [x, y, z], rotationY: r || 0 }, o || {})));

  // ---------------------------------------------------------------- floor (2 m tiles, seeded variation)
  const inChannel = (x, z) => z > ch.z0 && z < ch.z1 && !(x > ch.bridge[0] && x < ch.bridge[1]);
  const tiles = { floor: [], "floor-broken-a": [], "floor-broken-b": [] };
  for (let x = -9; x <= 9; x += 2) for (let z = -7; z <= 13; z += 2) {
    if (inChannel(x, z) || (x <= -9 && z <= -3)) continue;
    const r = NK.rng.float();
    const key = r < 0.06 ? "floor-broken-a" : r < 0.11 ? "floor-broken-b" : "floor";
    tiles[key].push([x, -0.075, z, NK.rng.int(0, 3) * Math.PI / 2, 1]);
  }
  for (const k in tiles) if (tiles[k].length) NK3D.instances(scene, k, tiles[k], { castShadow: false });
  solid(0, -0.5, 2, 30, 1, 30); // one flat ground collider (the channel is fenced on its lips)

  // ---------------------------------------------------------------- far walls (two tiers: 8 m)
  // pilasters continue through both tiers (vertical rhythm, like the reference's tall arcaded walls)
  const lower = {}, upper = {};
  L.walls.forEach(([k, x, z, r]) => { (lower[k] = lower[k] || []).push([x, 0, z, r]); const u = k === "wall-pillar" ? k : "wall"; (upper[u] = upper[u] || []).push([x, 4, z, r]); });
  for (const k in lower) NK3D.instances(scene, k, lower[k], { physics: "fixed", castShadow: false });
  for (const k in upper) NK3D.instances(scene, k, upper[k], { castShadow: false });
  const capUp = NK3D.instances(scene, "wall", [[V.x, 4, -8, 0, 1]], { castShadow: false });
  capUp.scale.set(1.25, 1, 1); capUp.position.x = V.x - V.x * 1.25;
  NK3D.instances(scene, "pillar", L.pillars.flatMap(([x, z]) => [[x, 0, z, 0], [x, 4, z, 0]]), { castShadow: false });
  L.pillars.forEach(([x, z]) => solid(x, 2, z, 1.5, 4, 1.5));

  // ---------------------------------------------------------------- the vault: deep arch, treasure niche, dais
  place("wall-arch", V.x, 0, F.north - 2, 0, { shadows: false });
  solid(V.x, 2, F.north - 2, 5, 4, 4); // the arch is decor: the chest stands in front of it
  NK3D.instances(scene, "floor", [[V.x - 1, -0.075, F.north - 1, 0], [V.x + 1, -0.075, F.north - 1, 0], [V.x - 1, -0.075, F.north - 3, 0], [V.x + 1, -0.075, F.north - 3, 0]], { castShadow: false });
  place("wall-inset", V.x, 0, F.north - 4.5, 0, { shadows: false });
  place("coins-large", V.x - 0.7, 0, F.north - 2.8, 0.3);
  place("coins-medium", V.x + 0.9, 0, F.north - 2.3, -0.5);
  // two-step dais: foundation blocks sunk into the floor (steps 0.3 m and 0.6 m), floor tiles on top
  NK3D.instances(scene, "block", [[V.x - 1.05, -1.4, F.north + 1.1, 0], [V.x + 1.05, -1.4, F.north + 1.1, 0]], { physics: "fixed", castShadow: false });
  const step = NK3D.instances(scene, "block", [[V.x - 2.1, -1.7, F.north + 2.75, 0], [V.x, -1.7, F.north + 2.75, 0], [V.x + 2.1, -1.7, F.north + 2.75, 0]], { castShadow: false });
  step.children.forEach((im) => squash(im, 1, 1, 0.5));
  solid(V.x, 0.15, F.north + 2.75, 6.3, 0.3, 1.1);
  NK3D.instances(scene, "floor", [[V.x - 1.05, 0.525, F.north + 1.1, 0, 1.08], [V.x + 1.05, 0.525, F.north + 1.1, 0, 1.08]], { castShadow: false });
  const stepTop = NK3D.instances(scene, "floor", [[V.x - 2.1, 0.225, F.north + 2.75, 0, 1], [V.x, 0.225, F.north + 2.75, Math.PI, 1], [V.x + 2.1, 0.225, F.north + 2.75, 0, 1]], { castShadow: false });
  stepTop.children.forEach((im) => squash(im, 1.05, 1, 0.55));
  place("candle-triple", V.x - 2.7, 0.3, F.north + 2.75, 0.4, { shadows: false });
  place("candle-triple", V.x + 2.7, 0.3, F.north + 2.75, -0.4, { shadows: false });

  // ---------------------------------------------------------------- water channel + bridge
  const blocks = [], curbs = [];
  for (let x = -9; x <= 11; x += 2) {
    if (x > ch.bridge[0] && x < ch.bridge[1]) continue;
    blocks.push([x, -2.15, ch.z0 - 1, 0], [x, -2.15, ch.z1 + 1, 0]);
    curbs.push([x, 0, ch.z0 - 0.28, 0], [x, 0, ch.z1 + 0.28, 0]);
  }
  for (const x of [ch.bridge[0] + 1, ch.bridge[1] - 1]) for (const z of [ch.z0 + 1, ch.z0 + 3]) blocks.push([x, -2.15, z, 0]);
  NK3D.instances(scene, "block", blocks, { castShadow: false });
  // curbs: foundation blocks squashed into a low stone lip (same palette, same bevels)
  NK3D.instances(scene, "block-front", curbs, { castShadow: false }).children.forEach((im) => squash(im, 1, 0.18, 0.26));
  // bridge rails: low lips along both sides
  NK3D.instances(scene, "block-front", [ch.bridge[0] + 0.25, ch.bridge[1] - 0.25].flatMap((x) => [[x, 0, ch.z0 + 1.05, Math.PI / 2], [x, 0, ch.z1 - 1.05, Math.PI / 2]]), { castShadow: false }).children.forEach((im) => squash(im, 1, 0.2, 0.26));
  // stone posts: the bridge's four corners + a rhythm along the lips
  const posts = [[ch.bridge[0] + 0.3, ch.z0 + 0.15], [ch.bridge[1] - 0.3, ch.z0 + 0.15], [ch.bridge[0] + 0.3, ch.z1 - 0.15], [ch.bridge[1] - 0.3, ch.z1 - 0.15], [-6, ch.z0 - 0.3], [6, ch.z0 - 0.3], [-6.5, ch.z1 + 0.3], [5, ch.z1 + 0.3]];
  NK3D.instances(scene, "column", posts.map(([x, z]) => [x, 0, z, 0, 1.05]), { physics: "fixed" });
  // the channel can't be walked into: long fences on its lips, broken at the bridge
  for (const [a, b] of [[-11, ch.bridge[0]], [ch.bridge[1], 12]]) { solid((a + b) / 2, 1, ch.z0 - 0.25, b - a, 2, 0.5); solid((a + b) / 2, 1, ch.z1 + 0.25, b - a, 2, 0.5); }
  for (const x of [ch.bridge[0] + 0.25, ch.bridge[1] - 0.25]) solid(x, 1, (ch.z0 + ch.z1) / 2, 0.3, 2, ch.z1 - ch.z0);
  const water = NK.use("Water")(scene, { x0: F.west - 0.6, x1: F.east + 3, z0: ch.z0, z1: ch.z1, y: ch.water });

  // ---------------------------------------------------------------- near parapets (south, east): low, dark, framing
  const para = [], posts2 = [];
  for (let z = F.north + 1; z < F.south + 2; z += 2.2) { if (z > ch.z0 - 1 && z < ch.z1 + 1) continue; para.push([F.east + 1.1, -0.95, z, Math.PI / 2]); }
  for (let x = F.west; x < F.east + 2; x += 2.2) para.push([x, -0.95, F.south + 1.1, 0]);
  L.torches.filter((t) => t[1] < 2).forEach(([x, , z, r]) => posts2.push([x - Math.sin(r) * 0.42, 0, z - Math.cos(r) * 0.42, 0, 0.75]));
  NK3D.instances(scene, "block", para, { physics: "fixed", castShadow: false });
  NK3D.instances(scene, "column", posts2.map((p) => [p[0], 0, p[2], 0, 1.2]), { physics: "fixed", castShadow: false });
  // beyond the parapets: a lower terrace of blocks that falls into darkness (the hall continues past the frame)
  const terrace = [];
  for (let x = F.west; x < F.east + 6; x += 2.2) terrace.push([x, -2.6, F.south + 3.3, 0]);
  for (let z = F.north; z < F.south + 4; z += 2.2) terrace.push([F.east + 3.3, -2.6, z, Math.PI / 2]);
  NK3D.instances(scene, "block", terrace, { castShadow: false, receiveShadow: false });

  // ---------------------------------------------------------------- banners, weapon rack, props, lantern
  L.banners.forEach(([k, x, z, r]) => place(k, x + Math.sin(r) * 0.12, 2.6, z + Math.cos(r) * 0.12, r, { shadows: false }));
  const R = L.rack;
  [-1.1, 1.1].forEach((d) => place("post", R.x, 0, R.z + d, 0, { scale: 0.55 }));
  place("shelf", R.x - 0.05, 1.35, R.z, -Math.PI / 2).scale.set(1.25, 1, 1);
  [[-0.75, "spear", 0.06], [-0.25, "halberd", -0.05], [0.3, "spear", -0.08], [0.8, "spear", 0.05]].forEach(([d, k, tilt]) => {
    const s = place(k, R.x - 0.35, k === "spear" ? 1.55 : 1.4, R.z + d, Math.PI / 2);
    s.rotation.z = tilt;
  });
  solid(R.x, 1, R.z, 0.8, 2, 2.6);
  L.props.forEach(([k, x, z, r, s]) => {
    const p = place(k, x, 0, z, r, { scale: s || 1 });
    if (k !== "bones" && k !== "skull") scene.body(p, { type: "fixed" });
  });
  const [lx, ly, lz] = L.lantern;
  place("chain", lx, ly + 3.9, lz, 0, { shadows: false, scale: 1.4 });
  place("lantern", lx, ly, lz, 0.4, { shadows: false, scale: 1.3 });

  // ---------------------------------------------------------------- torches (models + flames + fake light pools)
  NK3D.instances(scene, "torch", L.torches.map(([x, y, z, r]) => [x, y, z, r]), { castShadow: false });
  const lights = NK.use("TorchLights")(scene, L.torches.map(([x, y, z, r]) => ({ x: x + Math.sin(r) * 0.42, y: y + 0.62, z: z + Math.cos(r) * 0.42, r, post: y < 2 })), { lantern: [lx, ly - 0.15, lz] });

  // ---------------------------------------------------------------- the chest (focal point)
  const chest = place("chest", V.chest[0], V.chest[1], V.chest[2], 0, { scale: 1.05 });
  scene.body(chest, { type: "fixed" });
  const lid = chest.getObjectByName("chest_large_lid");
  return { L, chest, lid, water, lights };

  /** Non-uniform scale on every instance of an instanced mesh (keeps positions). */
  function squash(im, sx, sy, sz) {
    const m = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); m.decompose(p, q, s); m.compose(p, q, s.multiply(new T.Vector3(sx, sy, sz))); im.setMatrixAt(i, m); }
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }
});
