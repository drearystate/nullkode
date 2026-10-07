// Lighting and effects that the packs don't ship: torch flames, pooled torch lights with fake light falloff,
// the animated water channel, and a single instanced particle pool (sparks, embers, magic motes, dust).
// Draw-call budget: every effect family is ONE draw (instanced meshes / points), whatever the count.

// ------------------------------------------------------------------ torches + light pooling
// Real lights are expensive (≤ 4 in the kit's budget, and each one is paid per pixel). So:
//  - every torch gets an emissive low-poly flame, a glow sprite, and additive "light pool" decals on the floor and
//    wall behind it (a painted falloff that costs one draw for all torches);
//  - 3 real warm point lights follow the camera focus, each sitting on one of the nearest torches (they fade out,
//    move, and fade in, so you never see a light pop);
//  - 1 extra light is the "fx light": the vault's gold glow, borrowed by the mage's bolt while it flies.
NK.def("TorchLights", function (scene, torches, o) {
  const T = THREE, Look = NK.use("Look"), glow = Look.glow();
  o = o || {};
  const n = torches.length + (o.lantern ? 1 : 0);
  const pts = torches.map((t) => ({ x: t.x, y: t.y, z: t.z, r: t.r, post: !!t.post, seed: (t.x * 7.3 + t.z * 3.1) % 6.28 }));
  if (o.lantern) pts.push({ x: o.lantern[0], y: o.lantern[1], z: o.lantern[2], lantern: true, seed: 1.7 });

  // flames: two instanced cones (outer orange, inner yellow), flat shaded to match the low-poly packs
  const outer = new T.InstancedMesh(new T.ConeGeometry(0.17, 0.62, 6, 1), new T.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false }), n);
  const inner = new T.InstancedMesh(new T.ConeGeometry(0.1, 0.4, 5, 1), new T.MeshBasicMaterial({ color: 0xfff0b0, toneMapped: false }), n);
  outer.frustumCulled = inner.frustumCulled = false;
  scene.add(outer); scene.add(inner);

  // glow halos: one Points draw for all torches
  const gpos = new Float32Array(n * 3);
  pts.forEach((p, i) => gpos.set([p.x, p.y + 0.15, p.z], i * 3));
  const gGeo = new T.BufferGeometry(); gGeo.setAttribute("position", new T.BufferAttribute(gpos, 3));
  const halo = new T.Points(gGeo, new T.PointsMaterial({ map: glow, color: 0xffa250, size: 3.4, sizeAttenuation: true, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.frustumCulled = false;
  scene.add(halo);

  // light pools: floor decal under each torch + wall wash behind it (instanced additive quads)
  const floorPools = new T.InstancedMesh(new T.PlaneGeometry(1, 1), Look.additive(0xffa448, 0.2, glow), n);
  const wallPools = new T.InstancedMesh(new T.PlaneGeometry(1, 1), Look.additive(0xffaa58, 0.22, glow), n);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3();
  pts.forEach((p, i) => {
    const fx = p.r === undefined ? p.x : p.x + Math.sin(p.r) * 1.7, fz = p.r === undefined ? p.z : p.z + Math.cos(p.r) * 1.7;
    const size = p.lantern ? 6 : p.post ? 7 : 9.5;
    m4.compose(v.set(fx, 0.03, fz), q.setFromEuler(e.set(-Math.PI / 2, 0, 0)), s.set(size, size, 1));
    floorPools.setMatrixAt(i, m4);
    const onWall = p.r !== undefined && !p.lantern && !p.post;
    m4.compose(v.set(p.x - Math.sin(p.r || 0) * 0.33, p.y - 0.5, p.z - Math.cos(p.r || 0) * 0.33), q.setFromEuler(e.set(0, p.r || 0, 0)), s.set(onWall ? 4.6 : 0.001, onWall ? 5 : 0.001, 1));
    wallPools.setMatrixAt(i, m4);
  });
  floorPools.renderOrder = wallPools.renderOrder = 2;
  scene.add(floorPools); scene.add(wallPools);

  // real lights (pooled)
  const slots = [0, 1, 2].map(() => { const l = new T.PointLight(0xffa24a, 0, 14, 1.6); scene.add(l); return { l, torch: -1, want: 0 }; });
  const fxLight = new T.PointLight(0xffb450, 0, 9, 1.6);
  scene.add(fxLight);
  const api = { points: pts, fxLight, focus: new T.Vector3(), boost: 1, vault: null, borrowed: 0 };
  let t = 0, retarget = 0;
  const POWER = 30;
  scene.add({
    update(dt) {
      t += dt;
      // flicker the flames
      pts.forEach((p, i) => {
        const f = 1 + Math.sin(t * 11 + p.seed) * 0.12 + Math.sin(t * 23 + p.seed * 2) * 0.07;
        const lean = Math.sin(t * 5 + p.seed) * 0.08;
        m4.compose(v.set(p.x, p.y + 0.2 * f, p.z), q.setFromEuler(e.set(lean, 0, lean * 0.6)), s.set(p.lantern ? 0.7 : 1, f, p.lantern ? 0.7 : 1));
        outer.setMatrixAt(i, m4);
        m4.compose(v.set(p.x, p.y + 0.12 * f, p.z), q, s.set(p.lantern ? 0.7 : 1, f * 1.08, p.lantern ? 0.7 : 1));
        inner.setMatrixAt(i, m4);
      });
      outer.instanceMatrix.needsUpdate = inner.instanceMatrix.needsUpdate = true;
      halo.material.opacity = 0.75 + Math.sin(t * 9) * 0.05;
      // pick the 3 torches nearest the camera focus (re-evaluated 4× a second)
      retarget -= dt;
      if (retarget <= 0) {
        retarget = 0.25;
        const near = pts.map((p, i) => [i, (p.x - api.focus.x) ** 2 + (p.z - api.focus.z) ** 2 + (p.lantern ? 30 : 0)]).sort((a, b) => a[1] - b[1]).slice(0, 3).map((x) => x[0]);
        slots.forEach((sl) => { sl.want = near.indexOf(sl.torch) >= 0 ? 1 : 0; });
        for (const i of near) if (!slots.some((sl) => sl.torch === i)) { const free = slots.find((sl) => sl.want === 0 && sl.l.intensity < 0.5); if (free) { free.torch = i; free.want = 1; const p = pts[i]; free.l.position.set(p.x + Math.sin(p.r || 0) * 0.5, p.y + 0.3, p.z + Math.cos(p.r || 0) * 0.5); } }
      }
      slots.forEach((sl) => {
        const p = pts[sl.torch];
        const fl = p ? 1 + Math.sin(t * 13 + p.seed) * 0.08 + Math.sin(t * 29 + p.seed) * 0.05 : 1;
        const target = sl.want * POWER * fl * api.boost;
        sl.l.intensity += (target - sl.l.intensity) * Math.min(1, dt * (sl.want ? 4 : 7));
      });
      // fx light: vault glow unless a spell borrows it
      if (api.borrowed > 0) api.borrowed -= dt;
      else if (api.vault) { fxLight.color.setHex(0xffc464); fxLight.position.copy(api.vault); fxLight.intensity = (api.vaultPower || 11) * (1 + Math.sin(t * 3) * 0.06); fxLight.distance = 9; }
    },
  });
  return api;
});

// ------------------------------------------------------------------ water
// A flat-shaded plane whose vertices bob in two cross waves (low-poly facets catch the torch light), a teal
// emissive base so it glows like the reference, and twinkling highlight motes on the surface.
NK.def("Water", function (scene, o) {
  const T = THREE, Look = NK.use("Look");
  const w = o.x1 - o.x0, d = o.z1 - o.z0;
  const geo = new T.PlaneGeometry(w, d, Math.round(w / 0.9), Math.round(d / 0.9));
  geo.rotateX(-Math.PI / 2);
  const mat = new T.MeshStandardMaterial({ color: 0x175f6c, emissive: 0x0a3a46, emissiveIntensity: 1, roughness: 0.3, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.94, envMapIntensity: 0.25 });
  const mesh = new T.Mesh(geo, mat);
  mesh.position.set((o.x0 + o.x1) / 2, o.y, (o.z0 + o.z1) / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);
  // deep bed under the surface (dark, so the water reads deep)
  const bed = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ color: 0x06222a }));
  bed.rotation.x = -Math.PI / 2; bed.position.set(mesh.position.x, o.y - 0.9, mesh.position.z);
  scene.add(bed);
  const pos = geo.attributes.position, base = Float32Array.from(pos.array);
  // highlight motes
  const N = 26, mp = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { const x = o.x0 + 0.6 + ((i * 0.618) % 1) * (w - 1.2), z = o.z0 + 0.5 + ((i * 0.377 + 0.2) % 1) * (d - 1); mp.set([x, o.y + 0.06, z], i * 3); seeds.push(i * 1.37); }
  const mg = new T.BufferGeometry(); mg.setAttribute("position", new T.BufferAttribute(mp, 3));
  const motes = new T.Points(mg, new T.PointsMaterial({ map: Look.glow(), color: 0x9ff4ff, size: 0.55, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
  scene.add(motes);
  let t = 0;
  scene.add({
    update(dt) {
      t += dt;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        pos.array[i * 3 + 1] = Math.sin(x * 1.3 + t * 1.6) * 0.06 + Math.sin(z * 2.1 - t * 1.1 + x * 0.4) * 0.05;
      }
      pos.needsUpdate = true;
      for (let i = 0; i < N; i++) mp[i * 3] += Math.sin(t * 0.7 + seeds[i]) * 0.004 + 0.006;
      for (let i = 0; i < N; i++) if (mp[i * 3] > o.x1 - 0.5) mp[i * 3] = o.x0 + 0.5;
      mg.attributes.position.needsUpdate = true;
      motes.material.opacity = 0.45 + Math.sin(t * 2.3) * 0.15;
    },
  });
  return { mesh, motes };
});

// ------------------------------------------------------------------ particles (one instanced draw)
NK.def("FX", function (scene) {
  const T = THREE, Look = NK.use("Look");
  const N = 220;
  const mesh = new T.InstancedMesh(new T.OctahedronGeometry(0.075, 0), Look.additive(0xffffff, 1), N);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  const col = new T.Color(), zero = new T.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < N; i++) { mesh.setMatrixAt(i, zero); mesh.setColorAt(i, col.setRGB(1, 1, 1)); }
  scene.add(mesh);
  const parts = [];
  for (let i = 0; i < N; i++) parts.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, size: 1, r: 1, gg: 1, b: 1 });
  let next = 0;
  const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();
  const fx = {
    /** emit({at, n, color, speed, up, life, size, gravity, drag, spread}) */
    emit(o) {
      const c = new T.Color(o.color === undefined ? 0xffffff : o.color);
      for (let k = 0; k < (o.n || 8); k++) {
        const p = parts[next]; next = (next + 1) % N;
        const a = NK.rng.float(0, Math.PI * 2), el = NK.rng.float(-0.3, 1), sp = (o.speed || 3) * NK.rng.float(0.4, 1);
        p.x = o.at.x + NK.rng.float(-1, 1) * (o.spread || 0.1); p.y = o.at.y + NK.rng.float(-1, 1) * (o.spread || 0.1) * 0.5; p.z = o.at.z + NK.rng.float(-1, 1) * (o.spread || 0.1);
        p.vx = Math.cos(a) * sp * Math.cos(el) + (o.dir ? o.dir.x : 0); p.vy = Math.sin(el) * sp * 0.6 + (o.up || 0); p.vz = Math.sin(a) * sp * Math.cos(el) + (o.dir ? o.dir.z : 0);
        p.g = o.gravity === undefined ? -6 : o.gravity; p.drag = o.drag || 2; p.max = p.life = (o.life || 0.5) * NK.rng.float(0.6, 1);
        p.size = (o.size || 1) * NK.rng.float(0.7, 1.2); p.r = c.r; p.gg = c.g; p.b = c.b;
      }
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        const p = parts[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { mesh.setMatrixAt(i, zero); continue; }
        p.vy += p.g * dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const k = p.life / p.max, sc = p.size * (0.3 + 0.7 * k);
        m4.compose(v.set(p.x, p.y, p.z), q.set(0, Math.sin(p.life * 9) * 0.7, 0, 1).normalize(), s.set(sc, sc, sc));
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, col.setRGB(p.r * k, p.gg * k, p.b * k));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
  scene.add(fx);
  return fx;
});

// ------------------------------------------------------------------ floor markers (attack telegraphs, shadows)
NK.def("Marker", {
  /** Red wedge on the floor: the warrior's swing area. fill(0..1) grows with the wind-up. */
  sector(scene, radius, angle) {
    const T = THREE;
    const g = new T.Group();
    const base = new T.Mesh(new T.RingGeometry(0.35, radius, 18, 1, Math.PI / 2 - angle / 2, angle), new T.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.22, depthWrite: false }));
    const fill = new T.Mesh(new T.RingGeometry(0.35, radius, 18, 1, Math.PI / 2 - angle / 2, angle), new T.MeshBasicMaterial({ color: 0xff5a3a, transparent: true, opacity: 0.38, depthWrite: false, blending: T.AdditiveBlending }));
    const edge = new T.Mesh(new T.RingGeometry(radius - 0.08, radius, 18, 1, Math.PI / 2 - angle / 2, angle), new T.MeshBasicMaterial({ color: 0xff6040, transparent: true, opacity: 0.85, depthWrite: false }));
    [base, fill, edge].forEach((m) => { m.rotation.x = -Math.PI / 2; m.renderOrder = 3; g.add(m); });
    g.position.y = 0.05;
    g.visible = false;
    scene.add(g);
    return { group: g, set(v) { fill.scale.setScalar(Math.max(0.01, v)); edge.material.opacity = 0.5 + v * 0.5; } };
  },
  /** Red aim line on the floor: the archer's shot lane. */
  lane(scene, width) {
    const T = THREE;
    const g = new T.Group();
    const base = new T.Mesh(new T.PlaneGeometry(width, 1), new T.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.2, depthWrite: false }));
    const fill = new T.Mesh(new T.PlaneGeometry(width * 0.4, 1), new T.MeshBasicMaterial({ color: 0xff6a40, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending }));
    base.geometry.translate(0, 0.5, 0); fill.geometry.translate(0, 0.5, 0);
    [base, fill].forEach((m) => { m.rotation.x = -Math.PI / 2; m.renderOrder = 3; g.add(m); });
    g.position.y = 0.05; g.visible = false;
    scene.add(g);
    return { group: g, aim(from, to, v) { const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz); g.position.set(from.x, 0.05, from.z); g.rotation.y = Math.atan2(dx, dz) + Math.PI; base.scale.set(1, len, 1); fill.scale.set(1, Math.max(0.01, len * v), 1); } };
  },
});
