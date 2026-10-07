// Builds the whole village from src/levels.js: hex ground, river, roads, paved square, fields, buildings, props,
// forest and contact shadows. Used by the Game scene and the menu backdrop. Returns the village model (cells,
// buildings, villager routes) that placement and villagers work with.
(() => {
  // Small seeded random + value noise (the layout must look the same every run).
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(x, z, s) { let h = (x * 374761393 + z * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noise(x, z, s) {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // Static batching. Every static object (tiles, trees, rocks, props, walls) is baked into one merged geometry per
  // 20 m chunk, per material and per shadow flag: almost everything shares the one repainted hex-pack material, so the
  // whole world costs a few draw calls per chunk while off-screen chunks are still culled (in both render passes).
  // Keys may carry a tag: "pine|nocast" = same model, no shadow casting (deep forest).
  const VC = new Map(); // material -> vertex-colour twin (tile tints ride on a colour attribute)
  function vcMaterial(m) {
    if (!VC.has(m.uuid)) { const c = m.clone(); c.vertexColors = true; c.name = m.name; VC.set(m.uuid, c); }
    return VC.get(m.uuid);
  }
  function bake(parts) {
    let nv = 0, ni = 0;
    for (const [mesh] of parts) { const g = mesh.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3);
    const I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
    let vo = 0, io = 0;
    for (const [mesh, M, col] of parts) {
      const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, idx = g.index;
      nm.getNormalMatrix(M);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(M);
        P[(vo + i) * 3] = v.x; P[(vo + i) * 3 + 1] = v.y; P[(vo + i) * 3 + 2] = v.z;
        if (nor) { n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N[(vo + i) * 3] = n.x; N[(vo + i) * 3 + 1] = n.y; N[(vo + i) * 3 + 2] = n.z; }
        if (uv) { U[(vo + i) * 2] = uv.getX(i); U[(vo + i) * 2 + 1] = uv.getY(i); }
        C[(vo + i) * 3] = col.r; C[(vo + i) * 3 + 1] = col.g; C[(vo + i) * 3 + 2] = col.b;
      }
      if (idx) for (let k = 0; k < idx.count; k++) I[io + k] = idx.getX(k) + vo;
      else for (let k = 0; k < pos.count; k++) I[io + k] = k + vo;
      io += idx ? idx.count : pos.count;
      vo += pos.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(U, 2));
    geo.setAttribute("color", new THREE.BufferAttribute(C, 3));
    geo.setIndex(new THREE.BufferAttribute(I, 1));
    geo.computeBoundingSphere();
    geo.__nkOwned = true;
    return geo;
  }
  const TRI = {}; // debug: triangles per asset key baked so far (NK.use("villageStats"))
  NK.def("villageStats", TRI);
  function Batch(root) {
    const lists = new Map();
    const PAL = NK.use("palette");
    return {
      lists,
      add(key, x, y, z, rotY, scale, color) {
        if (!lists.has(key)) lists.set(key, []);
        lists.get(key).push([x, y, z, rotY || 0, scale || 1, color]);
      },
      build(flags) {
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        const s = new THREE.Vector3(), p = new THREE.Vector3(), WHITE = new THREE.Color(1, 1, 1);
        const groups = new Map();
        for (const [key, items] of lists) {
          const [asset, tag] = key.split("|");
          let src;
          try { src = NK3D.gltf(asset).scene; } catch (e) { NK.reportError(e, "village batch"); continue; }
          src.updateWorldMatrix(true, true);
          const k = PAL.scaleOf(asset), fl = (flags && (flags[key] || flags[asset])) || {};
          const cast = fl.cast !== false && tag !== "nocast", recv = fl.receive !== false;
          const meshes = [];
          src.traverse((m) => { if (m.isMesh && !m.isSkinnedMesh) meshes.push(m); });
          for (const it of items) {
            q.setFromAxisAngle(up, it[3]);
            if (Array.isArray(k)) s.set(k[0] * it[4], k[1] * it[4], k[2] * it[4]); else s.setScalar(it[4] * k);
            p.set(it[0], it[1], it[2]);
            m4.compose(p, q, s);
            const col = it[5] !== undefined ? new THREE.Color(it[5]) : WHITE;
            const ck = Math.floor(it[0] / 20) + "," + Math.floor(it[2] / 20);
            for (const mesh of meshes) {
              TRI[asset] = (TRI[asset] || 0) + (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
              const gk = ck + "|" + mesh.material.uuid + "|" + cast + "|" + recv;
              if (!groups.has(gk)) groups.set(gk, { mat: mesh.material, cast, recv, parts: [] });
              groups.get(gk).parts.push([mesh, new THREE.Matrix4().multiplyMatrices(m4, mesh.matrixWorld), col]);
            }
          }
        }
        const made = [];
        for (const g of groups.values()) {
          const mesh = new THREE.Mesh(bake(g.parts), vcMaterial(g.mat));
          mesh.castShadow = g.cast; mesh.receiveShadow = g.recv;
          mesh.name = "static:" + g.mat.name;
          mesh.matrixAutoUpdate = false;
          root.add(mesh);
          made.push(mesh);
        }
        lists.clear();
        return made;
      },
    };
  }

  /** Soft contact shadows: one instanced quad per blob [x, z, radiusX, radiusZ, rotY, strength]. */
  function blobs(root, list) {
    if (!list.length) return null;
    const PAL = NK.use("palette");
    const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: PAL.blobTexture(), color: 0x3a2d1a, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    list.forEach((b, i) => {
      q.setFromAxisAngle(up, b[4] || 0);
      im.setMatrixAt(i, m4.compose(new THREE.Vector3(b[0], b[6] || 0.012, b[1]), q, new THREE.Vector3(b[2], 1, b[3])));
      const st = b[5] === undefined ? 1 : b[5];
      im.setColorAt(i, col.setRGB(st, st, st)); // weaker blobs = lighter tint of the same dark colour
    });
    im.renderOrder = 1;
    im.castShadow = im.receiveShadow = false;
    im.computeBoundingSphere();
    im.name = "contact-shadows";
    root.add(im);
    return im;
  }

  /** Cobbled square: a grout slab per hex + a seamless lattice of small flat-shaded stones across all plaza cells. */
  function paving(root, cells, HX, rand) {
    const geos = [];
    const col = new THREE.Color();
    const tint = (g, hex) => {
      col.set(hex);
      const n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
      g.setAttribute("color", new THREE.BufferAttribute(a, 3));
      return g;
    };
    const isPlaza = new Set(cells.map((c) => HX.key(c[0], c[1])));
    for (const [c, r] of cells) {
      const w = HX.world(c, r);
      const slab = new THREE.CylinderGeometry(HX.R, HX.R, 0.05, 6, 1).rotateY(Math.PI / 6).translate(w.x, 0.0, w.z);
      geos.push(tint(slab.toNonIndexed(), "#a6977b"));
    }
    const STONES = ["#e6dbc2", "#ddd0b3", "#d2c3a4", "#e9e0ca", "#cdbd9c"];
    const step = 0.34, rowH = step * 0.866;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [c, r] of cells) { const w = HX.world(c, r); x0 = Math.min(x0, w.x - 1.2); x1 = Math.max(x1, w.x + 1.2); z0 = Math.min(z0, w.z - 1.2); z1 = Math.max(z1, w.z + 1.2); }
    let row = 0;
    for (let z = z0; z <= z1; z += rowH, row++) for (let x = x0 + (row & 1 ? step / 2 : 0); x <= x1; x += step) {
      const cell = HX.cellAt(x, z);
      if (!isPlaza.has(HX.key(cell[0], cell[1]))) continue;
      // keep stones off the outer rim so the slab edge reads as a kerb
      let rim = false;
      for (const [dx, dz] of [[0.16, 0], [-0.16, 0], [0, 0.16], [0, -0.16]]) { const cc = HX.cellAt(x + dx, z + dz); if (!isPlaza.has(HX.key(cc[0], cc[1]))) rim = true; }
      if (rim) continue;
      const h = 0.025 + rand() * 0.015;
      const st = new THREE.CylinderGeometry(0.155, 0.165, h, 6, 1).rotateY(rand() * 0.5).translate(x + (rand() - 0.5) * 0.03, 0.025 + h / 2, z + (rand() - 0.5) * 0.03);
      geos.push(tint(st.toNonIndexed(), STONES[Math.floor(rand() * STONES.length)]));
    }
    const merged = THREE.BufferGeometryUtils.mergeGeometries(geos.map((g) => { g.deleteAttribute("uv"); return g; }), false);
    merged.__nkOwned = true;
    const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true }));
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = "plaza";
    root.add(mesh);
    return mesh;
  }

  NK.def("buildVillage", function (scene, opts) {
    opts = opts || {};
    const L = NK.use("level"), HX = NK.use("hex"), PAL = NK.use("palette"), BLD = NK.use("buildings");
    PAL.apply(Object.keys(NK.assets.manifest()));
    const rand = rng(L.seed);
    const root = new THREE.Group();
    root.name = "village";
    scene.add(root);
    const batch = Batch(root);
    const shadows = [];
    const V = { root, cells: new Map(), buildings: [], spins: [], routes: {}, batch, shadows, rand, L, HX };
    const cellOf = (c, r) => V.cells.get(HX.key(c, r));
    V.cell = cellOf;
    V.cellAtWorld = (x, z) => { const [c, r] = HX.cellAt(x, z); return cellOf(c, r); };
    const b = L.bounds;
    for (let c = b.c0; c <= b.c1; c++) for (let r = b.r0; r <= b.r1; r++) {
      const w = HX.world(c, r);
      V.cells.set(HX.key(c, r), { c, r, x: w.x, z: w.z, kind: "grass", flow: [], links: [], building: null, trees: 0, props: 0 });
    }
    const link = (a, bb, field) => { const ca = cellOf(a[0], a[1]), cb = cellOf(bb[0], bb[1]); const j = HX.dirTo(a, bb); if (j < 0) return; if (ca) ca[field].push(j); if (cb) cb[field].push((j + 3) % 6); };

    // ---- river (flows off the map at both ends)
    const river = HX.path(L.river);
    V.river = river;
    river.forEach((p) => { const cl = cellOf(p[0], p[1]); if (cl) cl.kind = "river"; });
    for (let i = 0; i < river.length - 1; i++) link(river[i], river[i + 1], "flow");
    const end = (a, bb) => { const cl = cellOf(a[0], a[1]); if (cl) cl.flow.push((HX.dirTo(bb, a) + 6) % 6); };
    if (river.length > 1) { end(river[0], river[1]); end(river[river.length - 1], river[river.length - 2]); }

    // ---- square, bridges, roads, fields
    for (const [c, r] of L.plaza) cellOf(c, r).kind = "plaza";
    for (const br of L.bridges) { const cl = cellOf(br.at[0], br.at[1]); cl.kind = "bridge"; cl.bridgeAxis = br.axis; }
    for (const rd of L.roads) {
      const p = HX.path(rd.points);
      V.routes[rd.name] = p;
      for (const [c, r] of p) { const cl = cellOf(c, r); if (cl.kind === "grass") cl.kind = "road"; }
      for (let i = 0; i < p.length - 1; i++) link(p[i], p[i + 1], "links");
    }
    for (const [c, r] of L.fields) cellOf(c, r).kind = "field";
    for (const gd of L.gardens || []) cellOf(gd[0], gd[1]).garden = true;

    // ---- ground tiles
    const isOpen = (cl) => cl && (cl.kind === "grass" || cl.kind === "field");
    for (const cl of V.cells.values()) {
      const n = Math.floor(rand() * 6), big = (noise(cl.x * 0.07, cl.z * 0.07, 21) - 0.5) * 0.16, v = (rand() - 0.5) * 0.022 + big;
      const dd = Math.hypot((cl.x - L.village.center[0]) / (L.village.stretch || 1), cl.z - L.village.center[1]);
      const floor = THREE.MathUtils.smoothstep(dd, L.village.radius + 1, L.village.radius + 6) * 0.14; // darker, cooler forest floor
      const tint = [1 + v * 1.1 - floor * 1.1, 1 + v * 0.8 - floor * 0.7, 1 + v * 0.3 - floor * 0.6];
      if (cl.kind === "river" || cl.kind === "bridge") {
        const t = HX.autotile(HX.RIVER, cl.flow);
        if (t) { const straight = t.model === "river-a" && cl.kind !== "bridge" && rand() < 0.5; batch.add(straight ? "river-a-curvy" : t.model, cl.x, 0, cl.z, t.rotY + (straight && rand() < 0.5 ? Math.PI : 0), 1); cl.riverTile = t; }
        else { NK.reportError(new Error("no river tile for " + cl.flow), "village"); batch.add("hex-grass", cl.x, 0, cl.z, 0, 1); }
      } else if (cl.kind === "road") {
        const t = HX.autotile(HX.ROAD, cl.links);
        if (t) batch.add(t.model, cl.x, 0, cl.z, t.rotY, 1, new THREE.Color().setRGB(tint[0], tint[1], tint[2]).getHex());
        else { NK.reportError(new Error("no road tile for " + cl.links), "village"); batch.add("hex-grass", cl.x, 0, cl.z, 0, 1); }
      } else batch.add("hex-grass", cl.x, 0, cl.z, Math.PI / 6 + (n * Math.PI) / 3, 1, new THREE.Color().setRGB(tint[0], tint[1], tint[2]).getHex());
    }
    batch.build({ "hex-grass": { cast: false }, "river-a": { cast: false }, "river-a-curvy": { cast: false }, "river-b": { cast: false }, "river-c": { cast: false }, "road-a": { cast: false }, "road-b": { cast: false }, "road-c": { cast: false }, "road-d": { cast: false }, "road-e": { cast: false }, "road-f": { cast: false }, "road-g": { cast: false }, "road-m": { cast: false } });
    // ground beyond the tiles (only ever seen at the very edge of the widest zoom)
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6f9a46, roughness: 1, metalness: 0 }));
    skirt.position.y = -0.4; skirt.receiveShadow = true; skirt.geometry.__nkOwned = true;
    root.add(skirt);

    paving(root, L.plaza, HX, rand);

    // ---- fields: grain pads + low stone walls where a field meets open grass
    const wallRot = (j) => Math.PI / 6 + ((((2 - j) % 6) + 6) % 6) * Math.PI / 3; // fence model sits on model edge k = 3
    V.wallRot = wallRot;
    for (const [c, r] of L.fields) {
      const cl = cellOf(c, r);
      batch.add("grain", cl.x, 0, cl.z, Math.PI / 6 + Math.floor(rand() * 6) * Math.PI / 3, 1);
      for (let j = 0; j < 6; j++) {
        const [nc, nr] = HX.neighbour(c, r, j), nb = cellOf(nc, nr);
        if (nb && nb.kind === "grass" && !(j === 4 && rand() < 0.5)) batch.add("wall-stone", cl.x, 0, cl.z, wallRot(j), 0.94);
      }
    }

    // ---- buildings from the level
    const place = (type, c, r, face, model, extra) => {
      const cl = cellOf(c, r);
      const T = BLD.TYPES[type];
      const key = model || T.model;
      const rot = HX.faceRot(face);
      const bld = BLD.make(scene, type, cl.x, cl.z, rot, { model: key, rand });
      root.add(bld.group);
      bld.cell = cl; bld.face = face;
      cl.building = bld;
      V.buildings.push(bld);
      V.spins.push(...bld.spins);
      if (!extra || !extra.bare) BLD.decorate(batch, key, cl.x, cl.z, rot, rand, extra && extra.keep);
      shadows.push([cl.x, cl.z, T.footprint * 1.2 * PAL.STAND, T.footprint * 1.2 * PAL.STAND, 0, 0.9]);
      return bld;
    };
    V.place = place;
    for (const bd of L.buildings) {
      const bld = place(bd.type, bd.at[0], bd.at[1], bd.face, bd.model, { keep: bd.type === "house" ? 4 : undefined });
      if (bd.type === "house") houseYard(V, bld, rand);
    }
    for (const br of L.bridges) {
      const cl = cellOf(br.at[0], br.at[1]);
      const bld = BLD.make(scene, "bridge", cl.x, cl.z, HX.bridgeRot(br.axis), {});
      root.add(bld.group); bld.cell = cl; cl.building = bld; V.buildings.push(bld);
    }
    // jetty: a row of KayKit pallets from the bank out over the water (the pack's own dock is a raised wharf
    // for coast tiles), pointing at whichever neighbour is river; a barrel, crates and a moored boat
    for (const d of L.docks || []) {
      const cl = cellOf(d.at[0], d.at[1]);
      let face = d.face;
      for (let j = 0; j < 6; j++) { const nb = cellOf(...HX.neighbour(cl.c, cl.r, j)); if (nb && nb.kind === "river") { face = j; if (j === d.face) break; } }
      const a = (30 + 60 * face) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < 5; i++) { const t = 0.75 + i * 0.41; batch.add("pallet", cl.x + ca * t, i < 3 ? 0.0 : -0.02, cl.z + sa * t, Math.PI / 2 - a + (i % 2) * 0.04, 1); }
      batch.add("barrel", cl.x + ca * 2.45 + sa * 0.14, 0.09, cl.z + sa * 2.45 - ca * 0.14, 0.3, 0.9);
      batch.add("crate-small", cl.x + ca * 0.45 - sa * 0.5, 0, cl.z + sa * 0.45 + ca * 0.5, 0.6, 1);
      batch.add("bucket", cl.x + ca * 0.35 - sa * 0.75, 0, cl.z + sa * 0.35 + ca * 0.75, 0, 1);
      batch.add("boat", cl.x + ca * 1.95 + sa * 0.55, -0.15, cl.z + sa * 1.95 - ca * 0.55, Math.PI / 2 - a + 0.12, 0.62);
      const wet = cellOf(...HX.neighbour(cl.c, cl.r, face));
      if (wet) wet.jetty = true; // no reeds or rocks on the jetty's bank
      cl.dock = { face, x: cl.x + ca * 2.15, z: cl.z + sa * 2.15 };
    }

    // ---- forest: dense outside the village, irregular clearings from noise, nothing on paths, water or yards
    const vc = L.village.center, vr = L.village.radius, vs = L.village.stretch || 1;
    // detail level follows the kit's quality tier: phones (low/medium) get a thinner deep forest of bigger trees
    const lite = NK3D.world && NK3D.world.tier !== "high";
    const grove = new Map((L.groves || []).map((g) => [HX.key(g[0][0], g[0][1]), g[1]]));
    const near = (cl, kinds, ring) => { for (let j = 0; j < 6; j++) { const [nc, nr] = HX.neighbour(cl.c, cl.r, j); const nb = cellOf(nc, nr); if (nb && (kinds.indexOf(nb.kind) >= 0 || (ring && nb.building))) return true; } return false; };
    for (const cl of V.cells.values()) {
      if (cl.kind !== "grass" || cl.building || cl.garden) continue;
      const d = Math.hypot((cl.x - vc[0]) / vs, cl.z - vc[1]);
      const nz = noise(cl.x * 0.16, cl.z * 0.16, 3) - 0.5, nz2 = noise(cl.x * 0.45, cl.z * 0.45, 4) - 0.5;
      let dens = THREE.MathUtils.smoothstep(d + nz * 8 + nz2 * 3, vr - 3, vr + 3.5);
      if (d > vr + 3 && noise(cl.x * 0.22 + 40, cl.z * 0.22, 6) > 0.74) dens *= 0.25; // clearings inside the forest
      if (near(cl, ["road", "plaza", "bridge"], true)) dens *= 0.25;
      if (near(cl, ["river"], false)) dens *= 0.55;
      cl.density = dens;
      let n = dens > 0.8 ? (d > vr + 5.5 ? (lite ? 1 : 2) : lite ? 2 : 3) : dens > 0.55 ? 2 : dens > 0.3 ? 1 : 0;
      if (grove.has(HX.key(cl.c, cl.r))) { n = grove.get(HX.key(cl.c, cl.r)); dens = Math.max(dens, 0.45); } // hand-placed groves inside the village
      cl.trees = n;
      const spots = [[0, 0]];
      const a0 = rand() * Math.PI * 2;
      for (let i = 0; i < 6; i++) spots.push([Math.cos(a0 + i * 1.047) * 0.58, Math.sin(a0 + i * 1.047) * 0.58]);
      spots.sort(() => rand() - 0.5);
      for (let i = 0; i < n; i++) {
        const [ox, oz] = spots[i];
        const x = cl.x + ox + (rand() - 0.5) * 0.25, z = cl.z + oz + (rand() - 0.5) * 0.25;
        const deep = d > vr + 5.5;
        const sc = (deep ? (lite ? 1.35 : 1.05) : 0.8 + dens * 0.3) + rand() * 0.25;
        const kind = rand() < (lite ? 0.05 : 0.16) ? "pine-round" : "pine";
        batch.add(deep || lite ? kind + "|nocast" : kind, x, 0, z, rand() * Math.PI * 2, sc); // phones: only buildings cast shadows
        shadows.push([x, z, 0.4 * sc * PAL.STAND, 0.4 * sc * PAL.STAND, 0, 0.75]);
      }
      // forest edge / clearing dressing
      if (dens > 0.15 && dens < 0.75 && rand() < 0.45) {
        const a = rand() * Math.PI * 2, rr = 0.3 + rand() * 0.5;
        const pick = rand();
        if (pick < 0.45) batch.add("bush", cl.x + Math.cos(a) * rr, 0, cl.z + Math.sin(a) * rr, rand() * 6, 0.8 + rand() * 0.6);
        else if (pick < 0.72) batch.add(["rock-a", "rock-b", "rock-c", "rock-d", "rock-e"][Math.floor(rand() * 5)], cl.x + Math.cos(a) * rr, 0, cl.z + Math.sin(a) * rr, rand() * 6, 0.8 + rand() * 0.7);
        else batch.add("stump", cl.x + Math.cos(a) * rr, 0, cl.z + Math.sin(a) * rr, rand() * 6, 0.9 + rand() * 0.3);
      }
      // darker forest floor
      cl.forest = dens > 0.55;
    }

    // ---- river banks: reeds, lilies, stones (grouped at the banks, never mid-stream)
    for (const p of river) {
      const cl = cellOf(p[0], p[1]);
      if (!cl || cl.kind === "bridge") continue;
      const dry = [0, 1, 2, 3, 4, 5].filter((j) => cl.flow.indexOf(j) < 0);
      if (cl.jetty) continue;
      const count = rand() < 0.75 ? 2 : 1;
      for (let i = 0; i < count && dry.length; i++) {
        const j = dry[Math.floor(rand() * dry.length)];
        // reeds hug the water: pick a dry edge next to a flowing one, close to the channel
        const nextToFlow = cl.flow.some((f) => (f + 1) % 6 === j || (f + 5) % 6 === j);
        if (!nextToFlow) continue;
        const a = (30 + 60 * j) * Math.PI / 180 + (rand() - 0.5) * 0.4, rr = 0.48 + rand() * 0.14;
        const x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
        if (rand() < 0.7) { batch.add("reed", x, 0, z, rand() * 6, 1.1 + rand() * 0.5); if (rand() < 0.5) batch.add("reed", x + 0.12, 0, z + 0.08, rand() * 6, 0.9); }
        else batch.add(["rock-a", "rock-c", "rock-e"][Math.floor(rand() * 3)], x, -0.02, z, rand() * 6, 0.8 + rand() * 0.6);
      }
      if (rand() < 0.35) {
        const j = cl.flow[0], a = (30 + 60 * j) * Math.PI / 180 + 0.9, rr = 0.35;
        batch.add(rand() < 0.5 ? "lily-a" : "lily-b", cl.x + Math.cos(a) * rr, -0.19, cl.z + Math.sin(a) * rr, rand() * 6, 1.6);
      }
    }

    // ---- vegetable gardens: rows of dirt plots with lettuce (KayKit farmers set)
    for (const gd of L.gardens || []) {
      const cl = cellOf(gd[0], gd[1]);
      cl.garden = true; cl.trees = 0;
      const a = (gd[2] || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      for (let i = -1; i <= 1; i++) for (let j = 0; j < 2; j++) {
        const lx = i * 0.4, lz = (j - 0.5) * 0.5;
        const x = cl.x + lx * ca + lz * sa, z = cl.z - lx * sa + lz * ca;
        batch.add("dirt-plot", x, 0, z, a + (rand() - 0.5) * 0.15, 1.18);
        if ((i + j) % 2 === 0 || rand() < 0.3) batch.add("lettuce", x + (rand() - 0.5) * 0.04, 0.06, z + (rand() - 0.5) * 0.04, rand() * 6, 0.9 + rand() * 0.25);
      }
      batch.add("bucket", cl.x + 0.75 * ca + 0.1 * sa, 0, cl.z - 0.75 * sa + 0.1 * ca, 0, 1);
    }
    // ---- hand-placed vignettes (hay meadow, bench under a tree, ...)
    for (const sc of L.scenery || []) { batch.add(sc[0], sc[1], 0, sc[2], (sc[3] || 0) * Math.PI / 180, sc[4] || 1); const c = V.cellAtWorld(sc[1], sc[2]); if (c) c.props++; }

    // ---- the square: market cart + horse, benches, crates (around the well, paths kept clear)
    for (const pr of L.squareProps || []) {
      batch.add(pr[0], pr[1], 0.05, pr[2], (pr[3] || 0) * Math.PI / 180, pr[4] || 1);
      // the merchant cart's wheels are separate models in the same frame (so they could spin)
      if (pr[0] === "cart") for (const ax of ["cart-axle-front", "cart-axle-rear"]) batch.add(ax, pr[1], 0.05, pr[2], (pr[3] || 0) * Math.PI / 180, pr[4] || 1);
    }

    // tiny props don't cast (their contact is the blob shadow): keeps the shadow pass to trees, buildings and walls
    const NOCAST = ["reed", "lily-a", "lily-b", "grain", "sack", "dirt-plot", "lettuce", "bush", "bucket", "crate-small", "berry-basket", "flour-sack", "stump", "rock-a", "rock-b", "rock-c", "rock-d", "rock-e", "pallet", "boat", "cart-axle-front", "cart-axle-rear"];
    batch.build(Object.fromEntries(NOCAST.map((k) => [k, { cast: false }])));
    blobs(root, shadows);
    // per-cell walkable height (the square is raised a little; bridges arch)
    V.heightAt = (x, z) => {
      const cl = V.cellAtWorld(x, z);
      if (!cl) return 0;
      if (cl.kind === "plaza") return 0.05;
      if (cl.kind === "bridge") { const d = Math.hypot(x - cl.x, z - cl.z); return Math.max(0, 0.3 * (1 - (d / 1.35) * (d / 1.35))); }
      return 0;
    };
    V.update = (dt) => { for (const sp of V.spins) sp.obj.rotation[sp.axis] += sp.speed * dt; };
    // shared pieces for buildings placed during play
    V.makeBatch = (r) => Batch(r);
    let bg = null, bm = null, dg = null;
    V.blobGeo = () => bg || (bg = Object.assign(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), { __nkOwned: true }));
    V.blobMat = () => bm || (bm = new THREE.MeshBasicMaterial({ map: PAL.blobTexture(), color: 0x3a2d1a, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    V.dustGeo = () => dg || (dg = Object.assign(new THREE.RingGeometry(0.7, 0.95, 6, 1).rotateX(-Math.PI / 2), { __nkOwned: true }));
    return V;
  });

  /** A walled back garden for some houses: the back edge and one side as one continuous L of low stone wall,
   *  only when both neighbours are open grass (otherwise none: no stray wall pieces). */
  function houseYard(V, bld, rand) {
    const cl = bld.cell, HX = V.HX;
    if (rand() < 0.4) return;
    const side = rand() < 0.5 ? 2 : 4;
    const edges = [(bld.face + 3) % 6, (bld.face + side) % 6];
    for (const j of edges) {
      const [nc, nr] = HX.neighbour(cl.c, cl.r, j), nb = V.cell(nc, nr);
      if (!nb || nb.kind !== "grass" || nb.building) return;
    }
    for (const j of edges) V.batch.add("wall-stone", cl.x, 0, cl.z, V.wallRot(j), 0.94);
  }
})();
