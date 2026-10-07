// Building catalogue + how each building is assembled and dressed with props.
// Coordinates in `decor` lists are local to the building: x to its right, z out of its front door (metres; hex inradius 1).
(() => {
  // Buildable types (toolbar order) + scenery-only types. cost: resources spent; footprint: radius kept clear of props.
  const TYPES = {
    house: { label: "House", model: "home", alt: "home-b", cost: { wood: 10, stone: 4 }, footprint: 0.5, pop: 4, tip: "Room for 4 villagers" },
    farm: { label: "Farm", model: "grain", cost: { wood: 6, gold: 4 }, footprint: 0.98, field: true, tip: "+3 food a day" },
    windmill: { label: "Windmill", short: "Mill", model: "windmill", cost: { wood: 18, stone: 8, gold: 10 }, footprint: 0.55, tip: "+2 food a day, more beside farms" },
    lumber: { label: "Lumber Camp", short: "Lumber", model: "lumbermill", cost: { wood: 8, gold: 6 }, footprint: 0.72, tip: "+3 wood a day, best by the forest" },
    well: { label: "Well", model: "well", cost: { stone: 8 }, footprint: 0.38, tip: "Keeps the village happy: +1 gold a day" },
    bridge: { label: "Bridge", model: "bridge", cost: { wood: 12, stone: 6 }, footprint: 1, onRiver: true, tip: "Crosses a straight stretch of river" },
    // scenery only
    townhall: { model: "townhall", footprint: 0.78 },
    market: { model: "market", footprint: 0.9 },
    stables: { model: "stables", footprint: 1 },
    blacksmith: { model: "blacksmith", footprint: 0.68 },
  };
  const ORDER = ["house", "farm", "windmill", "lumber", "well", "bridge"];

  // Props around each building: [assetKey, x, z, rotationDeg, scale]. A seeded pick keeps 3-6 of them per building.
  const DECOR = {
    home: [["lumber", -0.62, -0.05, 90, 0.75], ["barrel", 0.5, 0.42, 0, 1], ["bush", 0.58, -0.42, 0, 0.9], ["bush", -0.5, -0.55, 40, 0.75], ["bench", 0.62, 0.05, 90, 1], ["bucket", -0.44, 0.46, 0, 1], ["crate-small", 0.38, 0.62, 20, 1]],
    "home-b": [["lumber", 0.64, -0.1, 90, 0.75], ["barrel", -0.52, 0.48, 0, 1], ["bush", -0.6, -0.4, 0, 0.9], ["bush", 0.55, -0.55, 20, 0.7], ["bench", -0.64, 0.05, -90, 1], ["crate", 0.48, 0.55, 10, 1]],
    townhall: [["flag", -0.5, 0.78, 0, 1.5], ["flag", 0.5, 0.78, 0, 1.5], ["bench", -0.86, 0.3, 90, 1], ["bush", 0.86, -0.2, 0, 0.9], ["barrel", 0.75, 0.45, 0, 1]],
    market: [["crate-veg", -0.35, 0.78, 0, 1], ["crate-veg-b", 0.15, 0.82, 8, 1], ["crate-bread", 0.62, 0.66, -12, 1], ["berry-basket", -0.78, 0.5, 0, 1], ["sack", 0.86, 0.28, 30, 1.2], ["barrel", -0.86, 0.18, 0, 1]],
    windmill: [["sack", 0.55, 0.42, 20, 1.3], ["sack", 0.68, 0.3, -30, 1.3], ["flour-sack", 0.45, 0.6, 0, 1], ["haybale", -0.6, 0.3, 80, 1], ["haybale", -0.7, 0.05, 95, 1], ["wheelbarrow", -0.45, 0.62, 140, 1], ["crate", 0.68, -0.3, 0, 1]],
    stables: [["haybale", -0.75, 0.75, 20, 1], ["trough", 0.6, 0.85, 0, 1], ["horse", 0.0, 1.05, 100, 1]],
    lumbermill: [["lumber", 0.8, 0.35, 0, 1.25], ["lumber", -0.7, 0.45, 30, 1], ["lumber", -0.78, 0.15, 10, 0.9], ["stump", 0.62, -0.6, 0, 1], ["stump", -0.7, -0.5, 0, 1], ["wheelbarrow", 0.3, 0.82, 200, 1]],
    blacksmith: [["stones", -0.65, 0.42, 20, 1], ["barrel", 0.62, 0.48, 0, 1], ["bucket", 0.48, 0.66, 0, 1], ["crate-small", -0.62, -0.42, 0, 1]],
    well: [["bucket", 0.32, 0.22, 0, 1]],
    lumber: [],
  };
  // Spinning parts (node name fragment) + speed in rad/s.
  const SPIN = { windmill: [["windmill_top_fan", 1.1]], lumbermill: [["lumbermill_saw", 5]], watermill: [["watermill_wheel", 0.8]] };

  /** Re-pivots a node around the centre of its own bounds so it can spin in place; axis = its thinnest side. */
  function pivot(node) {
    const box = new THREE.Box3().setFromObject(node);
    const parent = node.parent;
    parent.updateWorldMatrix(true, false);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const c = box.getCenter(new THREE.Vector3()).applyMatrix4(inv);
    const s = box.getSize(new THREE.Vector3());
    const p = new THREE.Group();
    p.position.copy(c);
    parent.add(p);
    node.position.sub(c);
    p.add(node);
    // thinnest axis in the building's frame
    const axis = s.x < s.y && s.x < s.z ? "x" : s.y < s.z ? "y" : "z";
    return { pivot: p, axis };
  }

  function make(scene, type, x, z, rotY, opts) {
    opts = opts || {};
    const T = TYPES[type] || { model: type, footprint: 0.6 };
    const key = opts.model || T.model;
    const g = new THREE.Group();
    g.position.set(x, opts.y || 0, z);
    g.rotation.y = rotY;
    const m = NK3D.model(key, { shadows: true, scale: NK.use("palette").scaleOf(key) });
    g.add(m);
    const spins = [];
    for (const [frag, speed] of SPIN[key] || []) {
      let node = null;
      m.traverse((n) => { if (!node && n.name && n.name.indexOf(frag) >= 0 && (n.isMesh || n.children.length)) node = n; });
      if (node) { g.updateWorldMatrix(true, true); const p = pivot(node); spins.push({ obj: p.pivot, axis: p.axis, speed: speed * (opts.rand ? 0.85 + opts.rand() * 0.3 : 1) }); }
    }
    return { group: g, type, key, spins, footprint: T.footprint, model: m };
  }

  /** Props for one building, in world space, pushed into a batch (seeded pick keeps it varied but fixed). */
  function decorate(batch, key, x, z, rotY, rand, keep) {
    const list = DECOR[key] || [];
    const K = NK.use("palette").STAND * 0.92; // props keep their place relative to the (enlarged) building
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const n = keep === undefined ? list.length : keep;
    const pick = list.map((p, i) => [rand(), i]).sort((a, b) => a[0] - b[0]).slice(0, n).map((e) => list[e[1]]);
    for (const [k, lx, lz, deg, sc] of pick) {
      const jx = (rand() - 0.5) * 0.06, jz = (rand() - 0.5) * 0.06; // controlled jitter, not scatter
      const wx = x + (lx + jx) * K * c + (lz + jz) * K * s, wz = z - (lx + jx) * K * s + (lz + jz) * K * c;
      batch.add(k, wx, 0, wz, rotY + (deg * Math.PI) / 180 + (rand() - 0.5) * 0.25, sc * (0.92 + rand() * 0.16));
    }
  }

  NK.def("buildings", { TYPES, ORDER, DECOR, make, decorate });
})();
