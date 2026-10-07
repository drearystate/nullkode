// Building placement + world input.
//  - choose a building in the toolbar (or keys 1-6): a ghost follows the pointer, snapped to the hex under it
//  - valid hex: solid gold ground outline + cream ghost; invalid: dashed brick outline + red ghost + the reason
//  - click (mouse) or tap twice (touch: first tap previews, second builds) to place: resources are spent and the
//    building pops in with a dust ring; right-click or the x button cancels
//  - drag pans, wheel / pinch zooms (the camera rig clamps both)
(() => {
  const GOLD = 0xe2b04a, BRICK = 0xc4553d, CREAM = 0xfff6e2;

  function hexPts(r) { const out = []; for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; out.push([Math.cos(a) * r, Math.sin(a) * r]); } return out; }
  /** Flat hex ring on the ground (y up); dashed = 3 dashes per edge. */
  function ringGeometry(ro, ri, dashed) {
    const O = hexPts(ro), I = hexPts(ri), pos = [];
    const quad = (a, b, c, d) => { pos.push(a[0], 0, a[1], b[0], 0, b[1], c[0], 0, c[1], a[0], 0, a[1], c[0], 0, c[1], d[0], 0, d[1]); };
    const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    for (let k = 0; k < 6; k++) {
      const o0 = O[k], o1 = O[(k + 1) % 6], i0 = I[k], i1 = I[(k + 1) % 6];
      if (!dashed) { quad(o0, o1, i1, i0); continue; }
      for (const [t0, t1] of [[0.0, 0.22], [0.39, 0.61], [0.78, 1.0]]) quad(lerp(o0, o1, t0), lerp(o0, o1, t1), lerp(i0, i1, t1), lerp(i0, i1, t0));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    g.__nkOwned = true;
    return g;
  }
  const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  NK.def("Placement", function (scene, V, rig, hud, econ) {
    const HX = V.HX, BLD = NK.use("buildings"), PAL = NK.use("palette");
    const w = scene.world, el = w.renderer.domElement;
    const R = HX.R;
    const st = { tool: null, cell: null, check: null, pending: null, ghost: null, ghostKey: null, anims: [], selT: 0 };

    // ---- outline (solid = valid / selected, dashed = invalid) + soft fill
    const mk = (geo, color, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.renderOrder = 3; return m; };
    const outline = new THREE.Group();
    const solid = mk(ringGeometry(R * 0.97, R * 0.84, false), GOLD, 0.95);
    const dashed = mk(ringGeometry(R * 0.97, R * 0.84, true), BRICK, 0.95);
    const fillGeo = new THREE.CircleGeometry(R * 0.84, 6).rotateX(-Math.PI / 2);
    fillGeo.__nkOwned = true;
    const fill = mk(fillGeo, GOLD, 0.16);
    outline.add(solid, dashed, fill);
    outline.visible = false;
    scene.add(outline);
    // a subtle outline for tapping an existing building
    const sel = mk(ringGeometry(R * 0.97, R * 0.88, false), CREAM, 0.8);
    sel.visible = false;
    scene.add(sel);

    // ---- ghost materials
    const ghostOk = new THREE.MeshStandardMaterial({ color: 0xfffaf0, emissive: 0x3a3020, roughness: 1, metalness: 0, transparent: true, opacity: 0.62 });
    const ghostBad = new THREE.MeshStandardMaterial({ color: 0xe0866d, emissive: 0x3a1408, roughness: 1, metalness: 0, transparent: true, opacity: 0.6 });
    function makeGhost(key) {
      if (st.ghost) { st.ghost.removeFromParent(); st.ghost = null; }
      if (!key) return;
      const g = new THREE.Group();
      const m = NK3D.model(key, { shadows: false, scale: PAL.scaleOf(key) });
      m.traverse((n) => { if (n.isMesh) { n.material = ghostOk; n.renderOrder = 2; } });
      g.add(m);
      g.visible = false;
      scene.add(g);
      st.ghost = g; st.ghostKey = key;
    }

    // ---- rules
    const VCX = V.L.village.center[0], VCZ = V.L.village.center[1];
    function faceFor(cell) {
      let best = 1, score = -1e9;
      for (let j = 0; j < 6; j++) {
        const [nc, nr] = HX.neighbour(cell.c, cell.r, j), nb = V.cell(nc, nr);
        const a = (30 + 60 * j) * Math.PI / 180;
        let sc = -Math.hypot(cell.x + Math.cos(a) * 2 - VCX, cell.z + Math.sin(a) * 2 - VCZ) * 0.1 + Math.sin(a) * 0.3; // face the square, a little towards the camera
        if (nb && (nb.kind === "road" || nb.kind === "plaza" || nb.kind === "bridge")) sc += 5;
        if (nb && nb.building) sc -= 2;
        if (sc > score) { score = sc; best = j; }
      }
      return best;
    }
    function bridgeAxis(cell) {
      const f = cell.flow[0];
      let best = -1, score = -1e9;
      for (const j of [(f + 1) % 6, (f + 2) % 6]) {
        const a = V.cell(...HX.neighbour(cell.c, cell.r, j)), b = V.cell(...HX.neighbour(cell.c, cell.r, j + 3));
        if (!a || !b || a.kind === "river" || b.kind === "river" || a.kind === "bridge" || b.kind === "bridge") continue;
        let sc = 0;
        for (const n of [a, b]) { if (n.kind === "road" || n.kind === "plaza") sc += 3; if (n.building) sc -= 4; if (n.trees) sc -= 1; }
        if (sc > score) { score = sc; best = j; }
      }
      return best;
    }
    function check(type, cell) {
      const T = BLD.TYPES[type];
      if (!cell) return { ok: false, why: "Out of the valley" };
      const short = Object.keys(T.cost).filter((k) => econ.run()[k] < T.cost[k]);
      const far = Math.hypot(cell.x - VCX, cell.z - VCZ) > 14;
      let r;
      if (T.onRiver) {
        if (cell.kind === "bridge") r = { ok: false, why: "There's already a bridge here" };
        else if (cell.kind !== "river") r = { ok: false, why: "Bridges go on the river" };
        else if (!cell.riverTile || cell.riverTile.model !== "river-a") r = { ok: false, why: "Needs a straight stretch of river" };
        else { const ax = bridgeAxis(cell); r = ax < 0 ? { ok: false, why: "No dry bank on both sides" } : { ok: true, axis: ax }; }
      } else if (cell.kind === "river") r = { ok: false, why: "That's the river (try a bridge)" };
      else if (cell.kind === "road" || cell.kind === "bridge") r = { ok: false, why: "Keep the road clear" };
      else if (cell.kind === "plaza") r = { ok: false, why: "The square stays open" };
      else if (cell.kind === "field") r = { ok: false, why: "That's a field" };
      else if (cell.building) r = { ok: false, why: "Something is already built here" };
      else if (cell.garden) r = { ok: false, why: "That's someone's vegetable garden" };
      else if (cell.props > 0) r = { ok: false, why: "Something is in the way" };
      else if (cell.trees > 0) r = { ok: false, why: "Trees in the way" };
      else if (far) r = { ok: false, why: "Too far from the village" };
      else if (type === "lumber" && !nearForest(cell)) r = { ok: false, why: "Build it next to the forest" };
      else r = { ok: true, face: faceFor(cell) };
      if (r.ok && short.length) r = { ok: false, why: "Needs " + short.map((k) => (T.cost[k] - Math.floor(econ.run()[k])) + " more " + k).join(", "), poor: true };
      if (r.ok) r.why = T.tip;
      return r;
    }
    function nearForest(cell) {
      for (const cl of V.cells.values()) if (cl.trees >= 2 && HX.distance([cl.c, cl.r], [cell.c, cell.r]) <= 2) return true;
      return false;
    }

    // ---- tool + preview
    function setTool(t) {
      if (t && st.tool === t) t = null; // pressing the active card again cancels
      st.tool = t; st.pending = null;
      makeGhost(t ? BLD.TYPES[t].model : null);
      hud.tool(t, econ.run());
      if (!t) { outline.visible = false; hud.message(""); }
      else hud.message(NK.input.lastDevice === "touch" ? "Tap a spot to preview it" : "Click a spot to build");
    }
    function preview(cell) {
      st.cell = cell;
      if (!st.tool || !cell) { outline.visible = false; if (st.ghost) st.ghost.visible = false; return; }
      const r = check(st.tool, cell);
      st.check = r;
      const y = cell.kind === "plaza" ? 0.08 : 0.025;
      outline.position.set(cell.x, y, cell.z);
      outline.visible = true;
      solid.visible = r.ok; dashed.visible = !r.ok;
      fill.material.color.setHex(r.ok ? GOLD : BRICK);
      if (st.ghost) {
        st.ghost.visible = true;
        st.ghost.position.set(cell.x, cell.kind === "river" ? 0 : 0, cell.z);
        st.ghost.rotation.y = st.tool === "bridge" ? HX.faceRot(r.axis >= 0 ? r.axis : (cell.flow[0] || 0) + 1) : st.tool === "farm" ? Math.PI / 6 : HX.faceRot(r.face === undefined ? 1 : r.face);
        st.ghost.traverse((n) => { if (n.isMesh) n.material = r.ok ? ghostOk : ghostBad; });
      }
      const touch = NK.input.lastDevice === "touch";
      hud.message(r.ok ? (touch && st.pending === cell ? "Tap again to build" : r.why) : r.why, !r.ok);
      hud.cost(st.tool, econ.run());
    }

    // ---- placing
    function build(type, cell, r) {
      const T = BLD.TYPES[type];
      econ.spend(T.cost);
      const holder = new THREE.Group();
      holder.position.set(cell.x, 0, cell.z);
      scene.add(holder);
      let bld;
      if (type === "bridge") {
        bld = BLD.make(scene, "bridge", 0, 0, HX.faceRot(r.axis), {});
        cell.kind = "bridge";
      } else if (type === "farm") {
        bld = BLD.make(scene, "farm", 0, 0, Math.PI / 6, {});
        cell.kind = "field";
        const mini = V.makeBatch(holder);
        for (let j = 0; j < 6; j++) { const nb = V.cell(...HX.neighbour(cell.c, cell.r, j)); if (nb && nb.kind === "grass" && !nb.building) mini.add("wall-stone", 0, 0, 0, V.wallRot(j), 0.94); }
        mini.build();
      } else {
        const rot = HX.faceRot(r.face);
        bld = BLD.make(scene, type, 0, 0, rot, { model: type === "house" && V.rand() < 0.5 ? "home-b" : undefined, rand: V.rand });
        const mini = V.makeBatch(holder);
        BLD.decorate(mini, bld.key, 0, 0, rot, V.rand, 3);
        mini.build();
      }
      holder.add(bld.group);
      bld.cell = cell; bld.face = r.face; bld.type = type; bld.holder = holder; bld.placed = true;
      cell.building = bld;
      V.buildings.push(bld);
      V.spins.push(...bld.spins);
      if (type !== "bridge" && type !== "farm") {
        const blob = new THREE.Mesh(V.blobGeo(), V.blobMat());
        const s = T.footprint * 1.2 * PAL.STAND;
        blob.scale.set(s, 1, s); blob.position.y = 0.012; blob.renderOrder = 1;
        holder.add(blob);
      }
      // pop in + dust ring
      holder.scale.setScalar(0.01);
      const ring = new THREE.Mesh(V.dustGeo(), new THREE.MeshBasicMaterial({ color: 0xf3e6c8, transparent: true, opacity: 0.85, depthWrite: false }));
      ring.position.set(cell.x, 0.04, cell.z);
      scene.add(ring);
      st.anims.push({ t: 0, holder, ring });
      NK.audio.play(V.rand() < 0.5 ? "sfx-place-1" : "sfx-place-2", { volume: 0.8, rate: 0.92 + V.rand() * 0.16 });
      econ.built(type, cell, bld);
    }
    function tryPlace(cell) {
      if (!st.tool) return;
      const r = check(st.tool, cell);
      if (!r.ok) { NK.audio.play("sfx-error", { volume: 0.6 }); preview(cell); return; }
      build(st.tool, cell, r);
      st.pending = null;
      preview(cell);
      hud.afford(econ.run());
      if (!check(st.tool, cell).ok && Object.keys(BLD.TYPES[st.tool].cost).some((k) => econ.run()[k] < BLD.TYPES[st.tool].cost[k])) hud.message("Out of resources: wait for the next day", true);
    }
    function selectAt(cell) {
      if (cell && cell.building && cell.building.type !== "bridge") {
        sel.position.set(cell.x, (cell.kind === "plaza" ? 0.08 : 0.025), cell.z);
        sel.visible = true; st.selT = 2.2;
        econ.inspect(cell.building, cell);
      } else sel.visible = false;
    }

    // ---- input: pointers on the game canvas (HUD elements sit above it and take their own taps)
    const pts = new Map();
    let pinch = null, dragged = false;
    const cellAt = (x, y) => { const g = rig.groundAt(x, y); return g ? V.cellAtWorld(g.x, g.z) : null; };
    const on = (type, fn, opts) => { el.addEventListener(type, fn, opts); scene.onDispose(() => el.removeEventListener(type, fn, opts)); };
    on("pointerdown", (e) => {
      if (NK.state.current !== "play") return;
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: NK.util.now(), button: e.button, type: e.pointerType });
      if (pts.size === 1) dragged = false;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; dragged = true; }
    });
    on("pointermove", (e) => {
      const p = pts.get(e.pointerId);
      if (!p) { if (e.pointerType === "mouse" && st.tool) preview(cellAt(e.clientX, e.clientY)); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (d > 10) rig.zoomBy(pinch.d / d, mx, my);
        rig.panBy(mx - pinch.mx, my - pinch.my);
        pinch = { d, mx, my };
        return;
      }
      if (!dragged && Math.hypot(p.x - p.x0, p.y - p.y0) > 8) dragged = true;
      if (dragged) rig.panBy(dx, dy);
      else if (e.pointerType === "mouse" && st.tool) preview(cellAt(e.clientX, e.clientY));
    });
    const up = (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (e.type === "pointercancel" || dragged || NK.util.now() - p.t0 > 700) { if (!pts.size) dragged = false; return; }
      if (p.button === 2) { setTool(null); return; }
      const cell = cellAt(e.clientX, e.clientY);
      if (!st.tool) { selectAt(cell); return; }
      if (p.type === "mouse") tryPlace(cell);
      else if (st.pending === cell) tryPlace(cell);
      else { st.pending = cell; preview(cell); }
    };
    on("pointerup", up);
    on("pointercancel", up);
    on("wheel", (e) => { e.preventDefault(); rig.zoomBy(Math.exp(THREE.MathUtils.clamp(e.deltaY, -120, 120) * 0.0015), e.clientX, e.clientY); if (st.tool) preview(cellAt(e.clientX, e.clientY)); }, { passive: false });
    on("contextmenu", (e) => e.preventDefault());
    // keys 1-6 pick a tool
    NK.input.bind({ tool1: ["Digit1"], tool2: ["Digit2"], tool3: ["Digit3"], tool4: ["Digit4"], tool5: ["Digit5"], tool6: ["Digit6"] });

    return {
      setTool, preview, tryPlace, check, st,
      get tool() { return st.tool; },
      update(dt) {
        for (let i = 1; i <= 6; i++) if (NK.input.pressed("tool" + i)) setTool(BLD.ORDER[i - 1]);
        if (st.ghost && st.ghost.visible) { const k = 0.55 + Math.sin(NK3D.world.time * 4) * 0.08; ghostOk.opacity = k; ghostBad.opacity = k; }
        if (st.selT > 0) { st.selT -= dt; sel.material.opacity = Math.min(0.8, st.selT * 1.5); if (st.selT <= 0) sel.visible = false; }
        for (let i = st.anims.length - 1; i >= 0; i--) {
          const a = st.anims[i];
          a.t += dt / 0.55;
          const t = Math.min(1, a.t);
          a.holder.scale.setScalar(Math.max(0.01, easeBack(t)));
          a.ring.scale.setScalar(1 + t * 1.6);
          a.ring.material.opacity = 0.85 * (1 - t);
          if (t >= 1) { a.ring.removeFromParent(); a.ring.material.dispose(); st.anims.splice(i, 1); NK.audio.play("sfx-built", { volume: 0.5 }); }
        }
      },
    };
  });
})();
