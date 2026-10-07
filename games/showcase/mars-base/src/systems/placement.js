// Build placement: pick a building → a ghost follows the pointer on a 1 m grid. The footprint ring and a badge
// show validity by colour AND shape (cyan ring + check = OK, orange hatched disc + cross = blocked).
// Rules: affordable, inside the build zone, clear of other structures, rocks and the rover lane, not in a crater.
// A Solar Panel near the open socket snaps onto it (objective 1).
NK.def("Placement", function (scene, o) {
  const P = NK.use("PALETTE"), T = THREE;
  const badgeTex = (good) => NK.use("sharedMaterial")("badge:" + good, () => {
    const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d");
    g.fillStyle = good ? "#48e0f0" : "#ff7a45"; g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2); g.fill();
    g.lineWidth = 6; g.strokeStyle = "rgba(20,32,58,.9)"; g.stroke();
    g.strokeStyle = "#14203a"; g.lineWidth = 11; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
    if (good) { g.moveTo(28, 50); g.lineTo(42, 64); g.lineTo(68, 34); } else { g.moveTo(32, 32); g.lineTo(64, 64); g.moveTo(64, 32); g.lineTo(32, 64); }
    g.stroke(); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  });
  const hatchTex = () => NK.use("sharedMaterial")("hatch", () => {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 7;
    for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 3); return t;
  });
  const root = new T.Group(); root.visible = false; scene.add(root);
  const ringOk = NK.use("groundRing")(0.92, 1, P.cyan, 0.95), discOk = NK.use("groundRing")(0, 0.92, P.cyan, 0.16);
  const ringBad = NK.use("groundRing")(0.92, 1, P.invalid, 0.95);
  const hatchGeo = new T.CircleGeometry(0.92, 40); hatchGeo.rotateX(-Math.PI / 2); hatchGeo.__nkOwned = true;
  const discBad = new T.Mesh(hatchGeo, NK.use("sharedMaterial")("hatchMat", () => new T.MeshBasicMaterial({ color: P.invalid, map: hatchTex(), transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
  discBad.renderOrder = 2;
  const foot = new T.Group(); foot.add(ringOk, discOk, ringBad, discBad); foot.position.y = 0.09; root.add(foot);
  const badge = new T.Sprite(new T.SpriteMaterial({ map: badgeTex(true), depthTest: false, transparent: true })); badge.scale.setScalar(1.3); badge.renderOrder = 5; root.add(badge);
  const shadow = NK.use("contactShadow")(1, 0.45); root.add(shadow);

  let def = null, ghost = null, ghostMats = [], rot = 0, ok = false, why = "", atSocket = false;
  const pos = new T.Vector3();
  const api = {
    get active() { return !!def; }, get def() { return def; }, get ok() { return ok; }, get why() { return why; }, get atSocket() { return atSocket; }, pos,
    start(id, at) {
      api.cancel();
      def = o.level.buildings.find((b) => b.id === id);
      ghost = NK.use("makeBuilding")(id);
      ghostMats = [];
      ghost.traverse((m) => {
        if (!m.isMesh) return;
        m.castShadow = false; m.receiveShadow = false;
        m.material = (Array.isArray(m.material) ? m.material : [m.material]).map((src) => { const c = src.clone(); c.transparent = true; c.opacity = Math.min(src.opacity, 0.78); c.emissive = new T.Color(P.cyan); c.emissiveIntensity = 0.28; ghostMats.push(c); return c; });
        if (m.material.length === 1) m.material = m.material[0];
      });
      root.add(ghost);
      const r = def.radius;
      foot.scale.set(r, 1, r); shadow.scale.set(r * 2, 1, r * 2);
      badge.position.y = new T.Box3().setFromObject(ghost).max.y + 1.1;
      root.visible = true;
      if (at) api.moveTo(at.x, at.z, true);
    },
    cancel() {
      if (ghost) { root.remove(ghost); ghostMats.forEach((m) => m.dispose()); ghost = null; }
      def = null; root.visible = false; atSocket = false;
    },
    rotate() { rot = (rot + 90) % 360; if (ghost) ghost.rotation.y = rot * Math.PI / 180; },
    /** Moves the ghost (snapped) and re-checks it. */
    moveTo(x, z) {
      if (!def) return;
      let sx = Math.round(x), sz = Math.round(z);
      atSocket = false;
      const sock = o.socket();
      if (def.id === "solar" && sock && Math.hypot(x - sock.x, z - sock.z) < 4.5) { sx = sock.x; sz = sock.z; atSocket = true; }
      pos.set(sx, 0, sz); root.position.set(sx, 0, sz);
      if (ghost) ghost.rotation.y = (atSocket ? sock.rot : rot) * Math.PI / 180;
      api.check();
    },
    check() {
      const have = o.have(), cost = def.cost;
      const short = Object.keys(cost).find((k) => (have[k] || 0) < cost[k]);
      const hub = o.level.base.hub, r = def.radius;
      const G = o.terrain.ground, c = G.crater(pos.x, pos.z);
      if (short) { ok = false; why = "Need " + cost[short] + " " + short; }
      else if (atSocket) { ok = true; why = "Connects the power line"; }
      else if (Math.hypot(pos.x - hub.x, pos.z - hub.z) > o.level.buildRadius) { ok = false; why = "Too far from the base"; }
      else if (c.inside > 0.02 || c.rim > 0.5) { ok = false; why = "Ground too rough"; }
      else if (o.solids.some((s) => (s.what !== "socket") && Math.hypot(pos.x - s.x, pos.z - s.z) < s.r + r * 0.85)) { ok = false; why = "Blocked"; }
      else { ok = true; why = "Tap again or press Place"; }
      ringOk.visible = discOk.visible = ok; ringBad.visible = discBad.visible = !ok;
      badge.material.map = badgeTex(ok);
      const col = ok ? P.cyan : P.invalid;
      ghostMats.forEach((m) => m.emissive.setHex(col));
      return ok;
    },
    /** Places it if valid → {def, x, z, rot, atSocket} or null. */
    confirm() {
      if (!def || !api.check()) return null;
      const out = { def, x: pos.x, z: pos.z, rot: atSocket ? o.socket().rot : rot, atSocket };
      api.cancel();
      return out;
    },
    update(dt) { if (root.visible) { const s = 1 + Math.sin(performance.now() / 220) * 0.04; badge.scale.setScalar(1.3 * s); void dt; } },
  };
  scene.add(api);
  return api;
});
