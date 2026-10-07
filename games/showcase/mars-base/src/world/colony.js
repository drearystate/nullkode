// The static colony set: base spine, landing pad, power line, props in functional groups, crystal deposit,
// framing boulders and the pebble scatter (fixed seed). Returns blockers for placement + handles for gameplay.
(function () {
  const deg = Math.PI / 180;

  /** Glow sprite (cheap stand-in for bloom on lamps/doors; additive, small, never hides geometry). */
  NK.def("glowSprite", function (color, size) {
    const tex = NK.use("sharedMaterial")("glowTex", () => {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    });
    const mat = NK.use("sharedMaterial")("glow:" + color, () => new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
    const s = new THREE.Sprite(mat); s.scale.setScalar(size); return s;
  });

  const BOULDER_TINT = 0xf2c9c2; // KayKit taupe rock × warm pink = the reference's mauve boulders
  NK.def("buildColony", function (scene, level, terrain) {
    const P = NK.use("PALETTE"), piece = NK.use("piece"), make = NK.use("makeBuilding"), top = NK.use("stackTop");
    const H = terrain.heightAt;
    const solids = [];   // placement blockers: {x, z, r, what}
    const blobs = [];    // contact shadows: [x, z, rx, rz, opacity]
    const out = { solids, blobs, lamps: [], glows: [] };
    // Static set pieces go into one group that is merged per material at the end (static batching).
    const statics = new THREE.Group();
    const put = (obj, x, z, rotDeg, y) => { obj.position.set(x, y !== undefined ? y : H(x, z), z); obj.rotation.y = (rotDeg || 0) * deg; statics.add(obj); return obj; };
    const solid = (x, z, r, what) => solids.push({ x, z, r, what });
    const blob = (x, z, rx, rz, a) => blobs.push([x, z, rx, rz === undefined ? rx : rz, a === undefined ? 0.5 : a]);
    const B = level.base;

    // ---- hub (focal point) + spine
    out.hub = put(make("hub", B.hub.scale, B.hub.variant), B.hub.x, B.hub.z, 0, 0);
    solid(B.hub.x, B.hub.z, 5.2, "hub"); blob(B.hub.x, B.hub.z, 5.6, 5.6, 0.55);
    const door = NK.use("glowSprite")(P.cyan, 1.6); door.position.set(B.hub.x + 0.05, 1.2, B.hub.z + 4.35); scene.add(door); out.glows.push(door);
    for (const s of B.spine) {
      if (s.kind === "module") {
        const m = put(piece(s.key, { scale: 3.4 }), s.x, s.z, s.rot, 0);
        solid(s.x, s.z, 4.0, "module"); blob(s.x, s.z, 4.4, 4.0, 0.5); void m;
      } else if (s.kind === "tunnel") {
        const t = piece("tunnel", { scale: 3.4, scaleXYZ: [s.len || 1, 1, 1] });
        put(t, s.x, s.z, 0, 1.0);
        solid(s.x - 2, s.z, 1.8, "tunnel"); solid(s.x + 2, s.z, 1.8, "tunnel"); blob(s.x, s.z, 3.6 * (s.len || 1), 1.9, 0.45);
      } else if (s.kind === "greenhouse") {
        out.greenhouse = put(make("greenhouse"), s.x, s.z, 0, 0);
        solid(s.x, s.z, 4.3, "greenhouse"); blob(s.x, s.z, 4.6, 4.6, 0.5);
      }
    }
    // ---- comms + life support behind the hub
    put(piece("dish", { height: B.dish.height, look: "base" }), B.dish.x, B.dish.z, B.dish.rot, 0);
    solid(B.dish.x, B.dish.z, 3.0, "dish"); blob(B.dish.x, B.dish.z, 3.2, 3.2, 0.5);
    for (const t of B.tanks) { put(make("tank"), t.x, t.z, 0, 0); solid(t.x, t.z, 1.9, "tank"); blob(t.x, t.z, 1.9, 1.9, 0.55); }
    out.generator = put(piece("generator", { height: 1.6, look: "base" }), B.generator.x, B.generator.z, B.generator.rot, 0);
    solid(B.generator.x, B.generator.z, 1.6, "generator"); blob(B.generator.x, B.generator.z, 1.7, 1.4, 0.5);
    out.battery = put(piece("generator", { height: 1.6, look: "base" }), B.battery.x, B.battery.z, B.battery.rot, 0);
    solid(B.battery.x, B.battery.z, 1.6, "battery"); blob(B.battery.x, B.battery.z, 1.7, 1.4, 0.5);

    // ---- landing pad + dropship + lamps at the pad corners
    const pad = put(piece("pad", { scaleXYZ: [6, 2.4, 6], variant: "white" }), B.pad.x, B.pad.z, B.pad.rot, 0); // orange skirt → white (palette)
    const padTop = top(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.9, 5.35, 48), NK.use("sharedMaterial")("padRing", () => new THREE.MeshStandardMaterial({ color: P.yellow, roughness: 0.6 })));
    ring.geometry.__nkOwned = true; ring.rotation.x = -Math.PI / 2; ring.position.set(B.pad.x, padTop + 0.02, B.pad.z); ring.receiveShadow = true; statics.add(ring);
    out.dropship = put(piece("dropship", { scale: 3.7 }), B.pad.x - 0.3, B.pad.z - 0.4, -35, padTop - 0.05);
    solid(B.pad.x, B.pad.z, 8.4, "pad"); blob(B.pad.x, B.pad.z, 8.6, 8.6, 0.45);
    for (const [x, z] of B.lamps) {
      const face = Math.atan2(B.pad.x - x, B.pad.z - z) * 180 / Math.PI; // floodlights face the pad
      const l = put(piece("lamp", { height: 3.6 }), x, z, face, 0);
      const g = NK.use("glowSprite")(0xfff1c8, 1.9); g.position.set(x, top(l) - 0.35, z); scene.add(g); out.glows.push(g);
      solid(x, z, 0.9, "lamp"); blob(x, z, 0.9, 0.9, 0.45);
    }

    // ---- power: solar arrays along the cable, the open socket, the cable itself
    const S = level.solar;
    for (const a of S.arrays) { put(make("solarArray"), a.x, a.z, a.rot, 0); solid(a.x, a.z, 2.6, "solar"); blob(a.x, a.z, 2.8, 2.8, 0.4); }
    out.socket = Object.assign({}, S.socket);
    out.cable = NK.use("buildCable")(scene, S.cable, { radius: 0.17 });
    out.socketCable = NK.use("buildCable")(scene, S.socketCable, { radius: 0.17 });

    // ---- props in functional groups
    for (const [key, x, z, rot, sc] of level.props) {
      const o = put(piece(key, { scale: sc, variant: "supply" }), x, z, rot);
      const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      solid(x, z, Math.max(sz.x, sz.z) * 0.55, "prop"); blob(x, z, sz.x * 0.62, sz.z * 0.62, 0.5);
    }

    // ---- crystal deposit
    const D = level.deposit;
    out.deposit = new THREE.Group(); out.deposit.position.set(D.x, 0, D.z); statics.add(out.deposit);
    out.crystalPieces = [];
    for (const [key, x, z, rot, sc] of level.depositRocks) {
      const o = piece(key, { scale: sc }); o.position.set(x - D.x, H(x, z) - 0.25 * sc, z - D.z); o.rotation.y = rot * deg;
      out.deposit.add(o); blob(x, z, sc * 1.6, sc * 1.6, 0.45);
    }
    NK.rng.seed(level.seed + 11);
    const SH = level.depositShards;
    for (let i = 0; i < SH.count; i++) {
      const a = (i / SH.count) * Math.PI * 2 + NK.rng.float(-0.3, 0.3), r = SH.spread * Math.sqrt(NK.rng.float(0.08, 1));
      const sc = NK.rng.float(SH.minScale, SH.maxScale) * (1 - r / SH.spread * 0.35);
      const o = piece("crystal", { scale: sc, override: "crystal" });
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8;
      o.position.set(x, H(D.x + x, D.z + z) + 0.15 + (1 - r / SH.spread) * 0.9, z);
      o.rotation.set(Math.sin(a) * NK.rng.float(0.2, 0.55), NK.rng.float(0, Math.PI * 2), -Math.cos(a) * NK.rng.float(0.2, 0.55), "YXZ");
      out.deposit.add(o); out.crystalPieces.push(o);
    }
    const dglow = NK.use("glowSprite")(P.cyan, 7); dglow.position.set(D.x, 1.2, D.z); dglow.material = dglow.material.clone(); dglow.material.opacity = 0.35; scene.add(dglow); out.depositGlow = dglow;
    solid(D.x, D.z, D.r + 0.5, "deposit");

    // ---- framing boulders (sunk a little so they sit in the ground, not on it)
    for (const [key, x, z, rot, sc] of level.boulders) {
      const o = piece(key, { scale: sc, tint: BOULDER_TINT });
      const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      put(o, x, z, rot, H(x, z) - sz.y * 0.12);
      solid(x, z, Math.max(sz.x, sz.z) * 0.5, "rock"); blob(x, z, sz.x * 0.62, sz.z * 0.62, 0.35);
    }

    // ---- merge the static set: ~150 meshes → one mesh per material (+ its shadow pass)
    scene.add(NK.use("batchStatic")(statics));

    // ---- rover lane stays clear (gameplay path)
    const R = level.rover;
    const lane = [R.x, R.z, D.x, D.z];
    for (let t = 0; t <= 1.0001; t += 1 / 6) solid(lane[0] + (lane[2] - lane[0]) * t, lane[1] + (lane[3] - lane[1]) * t, 2.4, "lane");

    // ---- pebble scatter: 4 instanced meshes, fixed seed, kept off solids/flats
    NK.rng.seed(level.seed);
    const lists = { "pebble-a": [], "pebble-b": [], "stones-a": [], "stones-b": [] };
    const keys = Object.keys(lists);
    // scatter density follows the quality tier (phones get half the pebbles; the look holds, the triangle count halves)
    const dens = { high: 1, medium: 0.75, low: 0.5 }[NK3D.world && NK3D.world.tier] || 1;
    const sc = Object.assign({}, level.scatter, { count: Math.round(level.scatter.count * dens), rocks: Math.round(level.scatter.rocks * dens) });
    const free = (x, z, k) => solids.every((s) => Math.hypot(x - s.x, z - s.z) > s.r + k) && level.flats.every(([fx, fz, r]) => Math.hypot(x - fx, z - fz) > r * 0.55);
    let tries = 0;
    while (tries++ < sc.count * 6 && keys.reduce((n, k) => n + lists[k].length, 0) < sc.count) {
      const a = NK.rng.float(0, Math.PI * 2), r = Math.sqrt(NK.rng.float()) * sc.radius;
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
      if (!free(x, z, sc.keepOut * 0.5)) continue;
      const k = NK.rng.pick(keys);
      const s = (k.startsWith("stones") ? 1.6 : 1.25) * NK.rng.float(0.45, 1.35) * (r < 30 ? 0.8 : 1);
      lists[k].push([x, H(x, z) - 0.05, z, NK.rng.float(0, Math.PI * 2), s]);
    }
    const tintFor = { "pebble-a": 0x5f5862, "pebble-b": 0x4d4652 };
    for (const k of keys) {
      if (!lists[k].length) continue;
      const g = NK3D.instances(scene, k, lists[k], { castShadow: false, receiveShadow: true });
      NK.use("normalise")(g, k.startsWith("stones") ? { look: "slate", castShadow: false } : { tint: tintFor[k], castShadow: false });
    }
    out.pebbles = lists;
    // mid-size rocks (0.6-1.6 m): KayKit boulders at small scale, same mauve tint, shadows on
    const mids = { "boulder-a": [], "boulder-c": [], "boulder-e": [] }, mk = Object.keys(mids);
    tries = 0; let placed = 0;
    while (tries++ < sc.rocks * 8 && placed < sc.rocks) {
      const a = NK.rng.float(0, Math.PI * 2), r = 7 + Math.sqrt(NK.rng.float()) * (sc.radius - 7);
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
      if (!free(x, z, 1.5)) continue;
      const s = NK.rng.float(0.2, 0.5) * (r < 30 ? 0.8 : 1.15);
      mids[NK.rng.pick(mk)].push([x, H(x, z) - s * 0.5, z, NK.rng.float(0, Math.PI * 2), s]); placed++;
      blob(x, z, s * 1.7, s * 1.7, 0.4);
    }
    for (const k of mk) if (mids[k].length) NK.use("normalise")(NK3D.instances(scene, k, mids[k], { castShadow: true, receiveShadow: true }), { tint: BOULDER_TINT });

    // ---- contact shadows: one instanced decal mesh
    const blobMat = NK.use("sharedMaterial")("blobMat", () => new THREE.MeshBasicMaterial({ map: NK.use("blobTexture")(), color: P.shadow, transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const bgeo = new THREE.PlaneGeometry(1, 1); bgeo.rotateX(-Math.PI / 2); bgeo.__nkOwned = true;
    const im = new THREE.InstancedMesh(bgeo, blobMat, blobs.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
    blobs.forEach(([x, z, rx, rz], i) => { m4.compose(v.set(x, H(x, z) + 0.05, z), q, s3.set(rx * 2.3, 1, rz * 2.3)); im.setMatrixAt(i, m4); });
    im.renderOrder = 1; im.frustumCulled = false;
    scene.add(im);
    out.blobMesh = im;
    return out;
  });

  /**
   * Static batching: bakes every mesh under root into world space and merges meshes that share a material
   * (and attribute layout + shadow flags) into one. KayKit pieces all share the atlas material, so the whole
   * colony renders in a handful of draw calls. Only for things that never move.
   */
  NK.def("batchStatic", function (root) {
    root.updateMatrixWorld(true);
    const buckets = new Map(), out = new THREE.Group(); out.name = "static-batch";
    const KEEP = ["position", "normal", "uv"];
    root.traverse((m) => {
      if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh) return;
      if (Array.isArray(m.material)) { const c = m.clone(); c.applyMatrix4(m.matrixWorld); out.add(c); return; }
      const g = new THREE.BufferGeometry();
      for (const k of KEEP) {
        const a = m.geometry.attributes[k]; if (!a) continue;
        const f = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a.getComponent(i, j);
        g.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize));
      }
      const idx = m.geometry.index;
      g.setIndex(idx ? Array.from(idx.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i));
      g.applyMatrix4(m.matrixWorld);
      const key = m.material.uuid + "|" + Object.keys(g.attributes).sort().join(",") + "|" + m.castShadow + m.receiveShadow;
      if (!buckets.has(key)) buckets.set(key, { mat: m.material, cast: m.castShadow, recv: m.receiveShadow, list: [] });
      buckets.get(key).list.push(g);
    });
    for (const b of buckets.values()) {
      const merged = b.list.length > 1 ? THREE.BufferGeometryUtils.mergeGeometries(b.list, false) : b.list[0];
      merged.__nkOwned = true; merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
      if (b.mat.transparent) mesh.renderOrder = 3;
      out.add(mesh);
      b.list.forEach((g) => { if (g !== merged) g.dispose(); });
    }
    return out;
  });

  /**
   * Power cable: a low dark conduit lying on the ground with yellow clamps; when powered, clamps glow and
   * energy pulses travel along it. buildCable(scene, [[x,z],...]) → { setPowered(on), update(dt), curve }.
   */
  NK.def("buildCable", function (scene, pts, o = {}) {
    const P = NK.use("PALETTE");
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, (o.radius || 0.17) + 0.02, z)), false, "catmullrom", 0.2);
    const len = curve.getLength();
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, Math.round(len * 2)), o.radius || 0.17, 6, false), NK.use("sharedMaterial")("cable", () => new THREE.MeshStandardMaterial({ color: P.cable, roughness: 0.7 })));
    tube.geometry.__nkOwned = true; tube.castShadow = true; tube.receiveShadow = true; scene.add(tube);
    const n = Math.max(2, Math.floor(len / 2.6));
    const clampMat = new THREE.MeshStandardMaterial({ color: P.yellow, roughness: 0.55, emissive: P.cableLit, emissiveIntensity: 0 });
    const cgeo = new THREE.BoxGeometry(0.34, 0.46, 0.6); cgeo.__nkOwned = true;
    const clamps = new THREE.InstancedMesh(cgeo, clampMat, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      q.setFromAxisAngle(up, Math.atan2(tg.x, tg.z)); m4.compose(p, q, one); clamps.setMatrixAt(i, m4);
    }
    clamps.castShadow = true; scene.add(clamps);
    const pulseN = Math.max(3, Math.floor(len / 3));
    const pgeo = new THREE.SphereGeometry(0.2, 8, 6); pgeo.__nkOwned = true;
    const pulses = new THREE.InstancedMesh(pgeo, new THREE.MeshBasicMaterial({ color: P.cableLit }), pulseN);
    pulses.visible = false; pulses.frustumCulled = false; scene.add(pulses);
    const h = {
      curve, length: len, powered: false, t: 0,
      setPowered(on) { h.powered = on; pulses.visible = on; clampMat.emissiveIntensity = on ? 0.55 : 0; },
      update(dt) {
        if (!h.powered) return;
        h.t = (h.t + dt * 4 / len) % 1;
        for (let i = 0; i < pulseN; i++) { const t = (h.t + i / pulseN) % 1; m4.compose(curve.getPointAt(t), q.identity(), one); pulses.setMatrixAt(i, m4); }
        pulses.instanceMatrix.needsUpdate = true;
      },
    };
    scene.add(h);
    return h;
  });
})();
