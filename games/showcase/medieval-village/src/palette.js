// Palette + material normalisation (runs once after the assets load).
//  1. The KayKit hex pack shares one 8x4 grid of vertical colour gradients (1024 px texture). We repaint the swatches
//     this village uses (grass, plaster, stone, roofs, timber, foliage, rock, water, paths) on a canvas and give every
//     hex-pack mesh that one texture: warm cream walls, terracotta roofs, fresh greens, one blue.
//  2. Every material becomes matte (roughness 1, metalness 0): no shine, no noisy speculars.
//  3. SCALE puts the character-scale KayKit sets (made for 2.3 m heroes) into the hex pack's miniature scale.
(() => {
  // Swatch (column,row) -> gradient stops [t, colour], t = 0 at the top of the 256 px swatch, 1 at the bottom.
  // The t ranges in the comments are where the hex-pack models actually sample (measured with tools/diag).
  const SWATCHES = {
    "0,2": [[0, "#8cb35c"], [0.29, "#77a04b"], [0.38, "#709947"], [0.4, "#6e9a42"], [0.75, "#587a37"], [1, "#4b6331"]], // grass: tops t .30-.37, tile sides below
    "1,0": [[0, "#fffaf0"], [0.45, "#f4e7cb"], [1, "#cdb795"]],             // plaster walls (cream)
    "2,0": [[0, "#f6ecd5"], [0.3, "#e4d6ba"], [0.62, "#b8a88f"], [1, "#7c6f60"]], // light walls + stone bases, bridge, garden walls
    "1,3": [[0, "#f2a477"], [0.4, "#dc7a4c"], [0.75, "#b85a35"], [1, "#8c3f25"]], // roofs: red -> terracotta
    "6,0": [[0, "#b98d68"], [0.45, "#8f603f"], [1, "#5a3a27"]],             // timber frames, doors, dirt pads
    "5,0": [[0, "#dcae7f"], [1, "#9b6c47"]],                                // planks, light wood
    "3,0": [[0, "#857a6e"], [1, "#4a433d"]],                                // dark stone, chimneys
    "6,1": [[0, "#c2b6a3"], [1, "#7d7062"]],                                // window frames, small stonework
    "3,2": [[0, "#ecdcb6"], [0.45, "#dcc39a"], [1, "#b8986e"]],             // dirt paths
    "1,2": [[0, "#84bd6a"], [0.36, "#5c9e52"], [0.55, "#3e8046"], [0.75, "#2c663f"], [1, "#1f4a33"]], // pine foliage (was emerald)
    "2,2": [[0, "#e0dbd0"], [0.35, "#b9b2a5"], [0.7, "#8f887d"], [1, "#68625b"]], // rocks: blue-grey -> warm grey
    "3,1": [[0, "#f0d58a"], [0.3, "#e2bf68"], [0.7, "#c99a45"], [1, "#a8772f"]],             // wheat fields (calmer gold)
    "1,1": [[0, "#8fd2ee"], [0.25, "#5cb4dc"], [0.6, "#3a89c0"], [1, "#24609c"]], // water
  };
  let cached = null;
  function paint(src) {
    const S = 1024, cv = NK.ui.h("canvas");
    cv.width = cv.height = S;
    const g = cv.getContext("2d");
    g.drawImage(src, 0, 0, S, S);
    const sw = S / 8, sh = S / 4;
    for (const key of Object.keys(SWATCHES)) {
      const [col, row] = key.split(",").map(Number);
      const grad = g.createLinearGradient(0, row * sh, 0, (row + 1) * sh);
      for (const [t, c] of SWATCHES[key]) grad.addColorStop(t, c);
      g.fillStyle = grad;
      g.fillRect(col * sw, row * sh, sw, sh);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // glTF UV convention
    tex.anisotropy = 4;
    return tex;
  }
  // Scale normalisation. Ground pieces (tiles, fields, lilies) stay at the hex pack's native size. Everything that stands on
  // the ground is enlarged by STAND so buildings fill their 2 m hex like a diorama, and character-scale KayKit sets
  // (made for 2.3 m heroes) are first brought down to the hex pack (×0.17), then enlarged the same way.
  const STAND = 1.4;
  const GROUND = new Set(["hex-grass", "road-a", "road-b", "road-c", "road-d", "road-e", "road-f", "road-g", "road-m", "river-a", "river-a-curvy", "river-b", "river-c", "grain", "dirt"]);
  const CHAR = { "farmer-a": 0.21, "farmer-b": 0.21, "berry-basket": 0.2, "flour-sack": 0.2, "log-stack": 0.2, "dirt-plot": 0.34, lettuce: 0.24, bush: 0.42, bench: 0.3 };
  const EXTRA = { windmill: 1.38, townhall: 1.12, bridge: 0.95, "lily-a": 1.1, "lily-b": 1.1, };
  function scaleOf(key) {
    if (GROUND.has(key)) return 1;
    if (key === "wall-stone") return [1, STAND, 1]; // walls sit on hex edges: keep their length, raise them
    return (CHAR[key] || 1) * STAND * (EXTRA[key] || 1);
  }
  // Gentle per-pack tints so sibling sets sit in the same palette; FACETED = smooth-shaded models drawn with flat facets
  // so every plant matches the hex pack's faceted pines.
  const TINT = { "dirt-plot": 0xd9c0a0 };
  const MAT_COLOR = {}; // per-material colour overrides by material name (none needed now)
  const FACETED = new Set(["pine-round", "bush", "lettuce"]);
  const done = new Set();

  // Ground tiles: bend the top + bevel normals towards straight up, so the hex rims read as a faint grid instead of
  // a bright honeycomb (the reference shows the grid, softly).
  const SOFT = ["hex-grass", "road-a", "road-b", "road-c", "road-d", "road-e", "road-f", "road-g", "road-m"];
  function soften(key) {
    let g; try { g = NK3D.gltf(key).scene; } catch (e) { return; }
    g.traverse((m) => {
      if (!m.isMesh || m.geometry.userData.nkSoft) return;
      const n = m.geometry.attributes.normal, p = m.geometry.attributes.position;
      if (!n) return;
      const v = new THREE.Vector3();
      for (let i = 0; i < n.count; i++) {
        if (p.getY(i) < -0.12) continue;
        v.set(n.getX(i), n.getY(i), n.getZ(i));
        if (v.y < 0.2) continue;
        v.lerp(new THREE.Vector3(0, 1, 0), 0.75).normalize();
        n.setXYZ(i, v.x, v.y, v.z);
      }
      n.needsUpdate = true;
      m.geometry.userData.nkSoft = true;
    });
  }

  // Characters: KayKit farmers are 7 skinned parts on one skeleton + one texture. Merging them into one skinned mesh
  // turns 7 draw calls per villager into 1. Skipped (left as is) if the parts don't match.
  function mergeSkinned(key) {
    let g; try { g = NK3D.gltf(key).scene; } catch (e) { return; }
    if (g.userData.nkMerged) return;
    g.userData.nkMerged = true;
    const list = [];
    g.traverse((m) => { if (m.isSkinnedMesh) list.push(m); });
    if (list.length < 2) return;
    const a = list[0];
    const sameBones = (m) => m.skeleton.bones.length === a.skeleton.bones.length && m.skeleton.bones.every((b, i) => b === a.skeleton.bones[i]);
    if (!list.every((m) => m.material === a.material && sameBones(m) && m.bindMatrix.equals(a.bindMatrix) && m.parent === a.parent)) return;
    const names = ["position", "normal", "uv", "skinIndex", "skinWeight"];
    const geos = [];
    for (const m of list) {
      const src = m.geometry, out = new THREE.BufferGeometry();
      for (const n of names) {
        const at = src.attributes[n];
        if (!at) return;
        const arr = n === "skinIndex" ? new Uint16Array(at.count * at.itemSize) : new Float32Array(at.count * at.itemSize);
        for (let i = 0; i < at.count; i++) for (let c = 0; c < at.itemSize; c++) arr[i * at.itemSize + c] = at.getComponent(i, c);
        out.setAttribute(n, new THREE.BufferAttribute(arr, at.itemSize));
      }
      if (src.index) out.setIndex(Array.from(src.index.array));
      out.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, 0).multiply(m.matrix).premultiply(new THREE.Matrix4().copy(a.matrix).invert()));
      geos.push(out);
    }
    const merged = THREE.BufferGeometryUtils.mergeGeometries(geos, false);
    if (!merged) return;
    const sm = new THREE.SkinnedMesh(merged, a.material);
    sm.name = key + "-merged";
    sm.position.copy(a.position); sm.quaternion.copy(a.quaternion); sm.scale.copy(a.scale);
    a.parent.add(sm);
    sm.bind(a.skeleton, a.bindMatrix);
    for (const m of list) m.removeFromParent();
  }

  NK.def("palette", {
    STAND, scaleOf,
    /** Repaints + mattes every loaded model once (the cached glTF scenes, so every clone shares it). */
    apply(keys) {
      SOFT.forEach(soften);
      ["farmer-a", "farmer-b"].forEach(mergeSkinned);
      let hexMat = null;
      for (const key of keys) {
        if (done.has(key)) continue;
        let g;
        try { g = NK3D.gltf(key); } catch (e) { continue; }
        done.add(key);
        g.scene.traverse((m) => {
          if (!m.isMesh) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          const out = mats.map((mat) => {
            if (mat.name === "hex-palette" || (mat.userData && mat.userData.nkMatte)) return mat; // already done (live edit)
            if (mat.name === "hexagons_medieval" && mat.map && mat.map.image) {
              if (!cached) cached = paint(mat.map.image);
              if (!hexMat) hexMat = NK.has("hexMaterial") ? NK.use("hexMaterial") : NK.def("hexMaterial", new THREE.MeshStandardMaterial({ name: "hex-palette", map: cached, roughness: 1, metalness: 0 }));
              if (!FACETED.has(key)) return hexMat;
              if (!NK.has("hexMaterialFlat")) { const f = hexMat.clone(); f.flatShading = true; f.name = "hex-palette"; NK.def("hexMaterialFlat", f); }
              return NK.use("hexMaterialFlat");
            }
            const c = mat.clone();
            c.roughness = 1; c.metalness = 0; c.userData.nkMatte = true;
            if (FACETED.has(key)) c.flatShading = true;
            if (TINT[key] !== undefined && c.color) c.color.multiply(new THREE.Color(TINT[key]));
            if (MAT_COLOR[mat.name] !== undefined && c.color) c.color.setHex(MAT_COLOR[mat.name]);
            return c;
          });
          m.material = Array.isArray(m.material) ? out : out[0];
        });
      }
    },
    /** A soft round contact-shadow texture (the kit has no SSAO: these ground every object). */
    blobTexture() {
      if (NK.has("blobTex")) return NK.use("blobTex");
      const cv = NK.ui.h("canvas");
      cv.width = cv.height = 64;
      const g = cv.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.45, "rgba(0,0,0,0.75)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return NK.def("blobTex", t);
    },
    COLORS: { gold: 0xe2b04a, invalid: 0xc4553d, cream: 0xf7eedb, navy: 0x1f2a44 },
  });
})();
