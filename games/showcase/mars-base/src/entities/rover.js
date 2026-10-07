// The rover: KayKit mobile-base frame (6 wheels) + command cab. Tap it to select (cyan ring), tap the crystal
// deposit to send it: a dashed cyan route is drawn, it drives out, mines, drives back and delivers crystals.
(function () {
  const P = () => NK.use("PALETTE");
  /** Flat ground marker helpers (rings, dashes): unlit, cyan, drawn over the ground. */
  NK.def("markerMaterial", (color, opacity) => NK.use("sharedMaterial")("mk:" + color + ":" + opacity, () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
  NK.def("groundRing", function (r0, r1, color, opacity) {
    const g = new THREE.RingGeometry(r0, r1, 48); g.rotateX(-Math.PI / 2); g.__nkOwned = true;
    const m = new THREE.Mesh(g, NK.use("markerMaterial")(color, opacity)); m.renderOrder = 2; return m;
  });

  /** Dashed route along a curve: route.show(curve) / hide() / update(dt) (dashes crawl toward the target). */
  NK.def("DashedRoute", function (scene) {
    const N = 60, dash = 0.95, gap = 0.75;
    const geo = new THREE.PlaneGeometry(0.42, dash); geo.rotateX(-Math.PI / 2); geo.__nkOwned = true;
    const mat = NK.use("markerMaterial")(P().cyan, 0.95);
    const im = new THREE.InstancedMesh(geo, mat, N); im.count = 0; im.frustumCulled = false; im.renderOrder = 2; scene.add(im);
    const target = new THREE.Group();
    target.add(NK.use("groundRing")(0.95, 1.3, P().cyan, 0.95), NK.use("groundRing")(0.0, 0.42, P().cyan, 0.95), NK.use("groundRing")(1.3, 1.9, P().cyan, 0.18));
    target.visible = false; scene.add(target);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const r = {
      curve: null, t: 0, from: 0,
      show(curve, from) { r.curve = curve; r.from = from || 0; target.visible = true; const e = curve.getPointAt(1); target.position.set(e.x, 0.07, e.z); r.layout(); },
      hide() { r.curve = null; im.count = 0; target.visible = false; },
      layout() {
        if (!r.curve) return;
        const len = r.curve.getLength(), step = dash + gap;
        let n = 0;
        for (let s = r.from * len + 2.6 + (r.t % step); s < len - 1.6 && n < N; s += step, n++) {
          const u = s / len; r.curve.getPointAt(u, p); const tg = r.curve.getTangentAt(u);
          q.setFromAxisAngle(up, Math.atan2(tg.x, tg.z)); p.y = 0.08; m4.compose(p, q, one); im.setMatrixAt(n, m4);
        }
        im.count = n; im.instanceMatrix.needsUpdate = true;
      },
      update(dt) {
        if (!r.curve) return;
        r.t += dt * 1.6; r.layout();
        const s = 1 + Math.sin(performance.now() / 260) * 0.08; target.scale.set(s, 1, s);
      },
    };
    scene.add(r);
    return r;
  });

  NK.def("Rover", function (scene, o) {
    const obj = NK.use("makeBuilding")("rover");
    const root = new THREE.Group(); root.name = "rover"; root.add(obj);
    root.add(NK.use("contactShadow")(2.1, 0.55));
    const ring = NK.use("groundRing")(2.55, 2.85, P().cyan, 0.95), fill = NK.use("groundRing")(0, 2.55, P().cyan, 0.12);
    ring.position.y = fill.position.y = 0.08; root.add(ring, fill);
    root.position.set(o.x, 0, o.z); root.rotation.y = o.rot * Math.PI / 180;
    scene.add(root);
    const wheels = []; obj.traverse((n) => { if (/wheel/i.test(n.name)) wheels.push(n); });
    const route = NK.use("DashedRoute")(scene);
    const home = new THREE.Vector3(o.x, 0, o.z);
    const rv = {
      object: root, state: "idle", selected: false, speed: 5.5, u: 0, curve: null, mineT: 0, load: 0,
      onDeliver: null, onArrive: null, home,
      select(on) { rv.selected = on; ring.visible = fill.visible = on || rv.state !== "idle"; },
      /** Route from here to the deposit edge; a gentle S-bend reads better than a ruler line. */
      planTo(dest) {
        const a = root.position.clone(), b = dest.clone(); b.y = 0;
        const d = b.clone().sub(a), n = new THREE.Vector3(-d.z, 0, d.x).normalize();
        const m1 = a.clone().lerp(b, 0.35).addScaledVector(n, 0.9), m2 = a.clone().lerp(b, 0.7).addScaledVector(n, -0.6);
        return new THREE.CatmullRomCurve3([a, m1, m2, b]);
      },
      preview(dest) { if (rv.state === "idle") route.show(rv.planTo(dest)); },
      clearPreview() { if (rv.state === "idle") route.hide(); },
      send(dest) {
        if (rv.state !== "idle") return false;
        rv.curve = rv.planTo(dest); rv.u = 0; rv.state = "out"; rv.select(true);
        route.show(rv.curve);
        return true;
      },
      hitTest(p) { return p && Math.hypot(p.x - root.position.x, p.z - root.position.z) < 3.2; },
      update(dt) {
        const len = rv.curve ? rv.curve.getLength() : 1;
        if (rv.state === "out" || rv.state === "back") {
          rv.u = Math.min(1, rv.u + (rv.speed * dt) / len);
          const p = rv.curve.getPointAt(rv.u), tg = rv.curve.getTangentAt(rv.u);
          root.position.set(p.x, 0, p.z);
          const want = Math.atan2(tg.x, tg.z);
          let da = want - root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
          root.rotation.y += da * Math.min(1, dt * 6);
          wheels.forEach((w) => { w.rotation.x += dt * rv.speed * 1.1; });
          obj.position.y = Math.abs(Math.sin(performance.now() / 90)) * 0.04;
          route.from = rv.u;
          if (rv.u >= 1) {
            if (rv.state === "out") { rv.state = "mining"; rv.mineT = 4; route.hide(); if (rv.onArrive) rv.onArrive(); }
            else { rv.state = "idle"; rv.select(false); route.hide(); if (rv.onDeliver) rv.onDeliver(rv.load); rv.load = 0; }
          }
        } else if (rv.state === "mining") {
          rv.mineT -= dt;
          obj.position.y = Math.abs(Math.sin(performance.now() / 120)) * 0.06;
          if (rv.mineT <= 0) { rv.state = "back"; rv.u = 0; rv.load = o.trip || 40; rv.curve = new THREE.CatmullRomCurve3(rv.curve.points.slice().reverse()); route.show(rv.curve); }
        }
        if (ring.visible) { const s = 1 + Math.sin(performance.now() / 300) * 0.03; ring.scale.set(s, 1, s); }
      },
    };
    rv.select(false);
    scene.add(rv);
    return rv;
  });
})();
