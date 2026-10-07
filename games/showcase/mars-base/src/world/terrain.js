// Low-poly Mars ground: one faceted mesh (flat shading, vertex colours from the palette) with craters carved in,
// gentle swells outside the base, and flat pads under the buildings. heightAt(x, z) matches the mesh.
(function () {
  // Small deterministic value noise (no Math.random: same ground every run).
  const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = (t) => t * t * (3 - 2 * t);
  function noise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    const u = smooth(xf), v = smooth(zf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, z) => noise(x, z) * 0.6 + noise(x * 2.1 + 5, z * 2.1 + 9) * 0.28 + noise(x * 4.3 + 1, z * 4.3 + 3) * 0.12;

  NK.def("makeGround", function (level) {
    const flats = level.flats, craters = level.craters;
    const flatMask = (x, z) => { // 0 on a pad, 1 in the open
      let m = 1;
      for (const [fx, fz, r] of flats) { const d = Math.hypot(x - fx, z - fz); m = Math.min(m, THREE.MathUtils.smoothstep(d, r, r + 6)); }
      return m;
    };
    function crater(x, z) {
      let h = 0, rim = 0, inside = 0;
      for (const c of craters) {
        const d = Math.hypot(x - c.x, z - c.z) / c.r;
        if (d < 1) { h -= c.depth * (1 - d * d) * (1 - d * d * 0.35); inside = Math.max(inside, 1 - d); }
        const rr = Math.exp(-((d - 1) * (d - 1)) / 0.045) * c.depth * 0.42;
        h += rr; rim = Math.max(rim, rr / (c.depth * 0.42));
      }
      return { h, rim, inside };
    }
    function heightAt(x, z) {
      const m = flatMask(x, z);
      const far = THREE.MathUtils.smoothstep(Math.hypot(x, z * 1.2), 38, 90);
      const swell = (fbm(x * 0.045, z * 0.045) - 0.5) * (0.9 + far * 5.5) + far * 1.4;
      const fine = (noise(x * 0.3, z * 0.3) - 0.5) * 0.06;
      return (swell + fine) * m + crater(x, z).h;
    }
    function colourAt(x, z, out) {
      const P = NK.use("PALETTE");
      const n = fbm(x * 0.06 + 20, z * 0.06 - 7), n2 = noise(x * 0.5, z * 0.5);
      const c = crater(x, z);
      out.setHex(P.ground);
      if (n > 0.56) out.lerp(_c.setHex(P.groundLight), Math.min(1, (n - 0.56) * 4));
      if (n < 0.42) out.lerp(_c.setHex(P.groundDark), Math.min(1, (0.42 - n) * 4));
      out.multiplyScalar(0.98 + n2 * 0.04);
      if (c.inside > 0) out.lerp(_c.setHex(P.craterIn), Math.min(0.9, 0.35 + c.inside * 1.4));
      if (c.rim > 0.25) out.lerp(_c.setHex(P.craterRim), Math.min(1, (c.rim - 0.25) * 1.2));
      return out;
    }
    const _c = new THREE.Color();
    return { heightAt, colourAt, flatMask, crater };
  });

  /** buildTerrain(scene, level) → { mesh, heightAt } : 260 m square, ~1.9 m facets (39k triangles). */
  NK.def("buildTerrain", function (scene, level) {
    const G = NK.use("makeGround")(level);
    const size = 260, seg = 140, step = size / seg, half = size / 2;
    const pos = [], col = [];
    const c = new THREE.Color();
    const vx = (i) => -half + i * step, vz = (j) => -half + j * step;
    // jitter the grid a little so facets aren't a visible lattice
    const jit = (i, j) => (i === 0 || j === 0 || i === seg || j === seg) ? [0, 0] : [Math.sin(i * 12.9898 + j * 78.233) * 0.22 * step, Math.cos(i * 39.346 + j * 11.135) * 0.22 * step];
    const P = [];
    for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) { const [dx, dz] = jit(i, j); const x = vx(i) + dx, z = vz(j) + dz; P.push([x, G.heightAt(x, z), z]); }
    const at = (i, j) => P[j * (seg + 1) + i];
    const tri = (a, b, d) => {
      pos.push(...a, ...b, ...d);
      const cx = (a[0] + b[0] + d[0]) / 3, cz = (a[2] + b[2] + d[2]) / 3;
      G.colourAt(cx, cz, c);
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    };
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
      const a = at(i, j), b = at(i + 1, j), d = at(i, j + 1), e = at(i + 1, j + 1);
      if ((i + j) % 2) { tri(a, d, b); tri(b, d, e); } else { tri(a, d, e); tri(a, e, b); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    geo.__nkOwned = true;
    const mat = NK.use("sharedMaterial")("ground", () => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = "ground";
    scene.add(mesh);
    return { mesh, heightAt: G.heightAt, ground: G };
  });
})();
