// Small pooled effects (no allocation per frame): dust puffs when something is built, crystal sparkles when the
// rover mines or delivers, and a "pop" scale-in for new buildings. Respects Reduce motion (fewer, calmer bits).
NK.def("Effects", function (scene) {
  const P = NK.use("PALETTE"), T = THREE;
  const N = 48;
  const dustGeo = new T.IcosahedronGeometry(0.5, 0); dustGeo.__nkOwned = true;
  const dustMat = NK.use("sharedMaterial")("dust", () => new T.MeshStandardMaterial({ color: 0xc98b74, roughness: 1, flatShading: true, transparent: true, opacity: 0.85 }));
  const sparkGeo = new T.OctahedronGeometry(0.22, 0); sparkGeo.__nkOwned = true;
  const sparkMat = NK.use("sharedMaterial")("spark", () => new T.MeshBasicMaterial({ color: P.crystal }));
  const pool = [];
  for (let i = 0; i < N; i++) { const m = new T.Mesh(i < 32 ? dustGeo : sparkGeo, i < 32 ? dustMat : sparkMat); m.visible = false; m.userData = { life: 0, max: 1, v: new T.Vector3() }; scene.add(m); pool.push(m); }
  const pops = [];
  const take = (spark) => { for (let i = spark ? 32 : 0; i < (spark ? N : 32); i++) if (!pool[i].visible) return pool[i]; return null; };
  const calm = () => !!NK.settings.get("reduceMotion");
  const fx = {
    puff(x, z, r) {
      const n = calm() ? 6 : 14;
      for (let i = 0; i < n; i++) {
        const m = take(false); if (!m) return;
        const a = (i / n) * Math.PI * 2 + NK.rng.float(-0.2, 0.2);
        m.position.set(x + Math.cos(a) * r * 0.7, 0.3, z + Math.sin(a) * r * 0.7);
        m.userData.v.set(Math.cos(a) * NK.rng.float(1.5, 3), NK.rng.float(0.6, 1.6), Math.sin(a) * NK.rng.float(1.5, 3));
        m.userData.life = m.userData.max = NK.rng.float(0.45, 0.6); m.scale.setScalar(NK.rng.float(0.6, 1.2)); m.visible = true;
      }
    },
    sparkle(x, y, z, n) {
      for (let i = 0; i < (calm() ? Math.ceil(n / 2) : n); i++) {
        const m = take(true); if (!m) return;
        m.position.set(x + NK.rng.float(-0.6, 0.6), y, z + NK.rng.float(-0.6, 0.6));
        m.userData.v.set(NK.rng.float(-1.2, 1.2), NK.rng.float(2.5, 4.5), NK.rng.float(-1.2, 1.2));
        m.userData.life = m.userData.max = NK.rng.float(0.45, 0.6); m.scale.setScalar(1); m.visible = true;
      }
    },
    /** Scale-in with a little overshoot (buildings appearing). */
    popIn(obj, dur) { obj.scale.set(1, 0.05, 1); pops.push({ obj, t: 0, dur: dur || 0.45 }); },
    update(dt) {
      for (const m of pool) {
        if (!m.visible) continue;
        const u = m.userData; u.life -= dt;
        if (u.life <= 0) { m.visible = false; continue; }
        m.position.addScaledVector(u.v, dt); u.v.y -= 6 * dt; u.v.multiplyScalar(1 - dt * 2.5);
        const k = u.life / u.max; m.scale.setScalar(Math.max(0.05, k) * (m.geometry === dustGeo ? 1.1 : 1));
        if (m.position.y < 0.1) { m.position.y = 0.1; u.v.y = 0; }
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.t += dt; const u = Math.min(1, p.t / p.dur);
        const s = u < 1 ? 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2) : 1; // ease-out-back
        p.obj.scale.set(1 + (1 - u) * 0.08, Math.max(0.05, s), 1 + (1 - u) * 0.08);
        if (u >= 1) { p.obj.scale.set(1, 1, 1); pops.splice(i, 1); }
      }
    },
  };
  scene.add(fx);
  return fx;
});
