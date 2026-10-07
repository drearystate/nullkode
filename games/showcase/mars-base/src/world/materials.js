// Palette + material normalisation: one look for KayKit (textured atlas) and Kenney (flat, *unlit*) pieces.
// Rule: every surface is lit the same way (MeshStandardMaterial, rough, non-metal) and every colour comes from PALETTE.
// Kenney Space Kit GLBs carry flat named colours with glTF's default metalness 1 (pale, mirror-like under the
// environment map): they are rebuilt here by material name. KayKit pieces keep their gradient atlas.
NK.def("PALETTE", {
  ground: 0xa25f4f, groundLight: 0xac6857, groundDark: 0x93574a, craterIn: 0x87503f, craterRim: 0xb27161,
  boulder: 0x84544c, boulderDark: 0x6c4340, slate: 0x46404f, slateDark: 0x37323f,
  crystal: 0x8eeaf8, crystalGlow: 0x2fc6e0,
  white: 0xeceef3, lightGrey: 0xb9bdca, navy: 0x2c3550, yellow: 0xf2b630,
  cyan: 0x48e0f0, invalid: 0xff6a3d, shadow: 0x3a2329,
  glass: 0xc9ecf7, cable: 0x2a3042, cableLit: 0xffd25a,
});

(function () {
  const P = NK.use("PALETTE");
  // Kenney Space Kit material names → palette colour, per look.
  const LOOKS = {
    base: { metal: P.white, metalDark: P.lightGrey, dark: P.navy, metalRed: P.yellow, _defaultMat: P.white, grey: P.lightGrey, pylon: P.yellow },
    boulder: { rock: P.boulder, rockTrack: P.boulder, rockDark: P.boulderDark },
    slate: { rock: P.slate, rockTrack: P.slate, rockDark: P.slateDark },
    crystal: { rock: P.slate, rockTrack: P.slateDark, rockDark: P.slateDark, crystal: P.crystal },
    ground: { rock: P.groundDark, rockTrack: P.groundDark, rockDark: P.craterIn },
  };
  // Whole-piece material overrides (e.g. a purple tower-defence crystal → the colony's cyan crystal).
  const OVERRIDES = {
    crystal: () => new THREE.MeshStandardMaterial({ color: P.crystal, emissive: P.crystalGlow, emissiveIntensity: 0.75, roughness: 0.18, metalness: 0, flatShading: true }),
  };
  const cache = new Map(); // shared materials = fewer shader programs and draw-state changes
  function shared(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }
  const glass = () => shared("glass", () => new THREE.MeshStandardMaterial({ color: P.glass, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.38, depthWrite: false, envMapIntensity: 1.6 }));

  /**
   * normalise(object, { look: "base"|"boulder"|"slate"|"crystal"|"ground", tint: 0xRRGGBB, shadows: true })
   * - Kenney unlit MeshBasicMaterial → MeshStandardMaterial with the palette colour for its material name.
   * - "Glass" (KayKit) → one shared glass material.
   * - tint: multiplies textured KayKit materials (e.g. orange KayKit rocks → Mars ground tones).
   */
  NK.def("normalise", function (obj, o = {}) {
    const look = LOOKS[o.look || "base"] || LOOKS.base;
    const over = o.override ? shared("ov:" + o.override, () => OVERRIDES[o.override]()) : null;
    obj.traverse((m) => {
      if (!m.isMesh) return;
      if (over) { m.material = over; m.castShadow = o.shadows !== false; m.receiveShadow = true; return; }
      m.castShadow = o.castShadow !== undefined ? o.castShadow : o.shadows !== false;
      m.receiveShadow = o.shadows !== false;
      const fix = (mat) => {
        const name = mat.name || "";
        if (/glass/i.test(name) || (mat.transparent && mat.opacity < 0.3 && !mat.map)) return glass();
        // Kenney: untextured, named flat colours, glTF default metalness 1 (reads washed-out) or unlit.
        if (!mat.map && (mat.isMeshBasicMaterial || look[name] !== undefined || LOOKS.base[name] !== undefined)) {
          const col = look[name] !== undefined ? look[name] : LOOKS.base[name] !== undefined ? LOOKS.base[name] : mat.color.getHex();
          const glow = name === "crystal" && o.look === "crystal";
          return shared("k:" + (o.look || "base") + ":" + name, () => new THREE.MeshStandardMaterial({
            color: col, roughness: glow ? 0.25 : 0.82, metalness: 0, flatShading: true,
            emissive: glow ? P.crystalGlow : 0x000000, emissiveIntensity: glow ? 0.9 : 0,
          }));
        }
        if (o.tint !== undefined && mat.map) {
          return shared("t:" + mat.uuid + ":" + o.tint, () => { const c = mat.clone(); c.color.setHex(o.tint); return c; });
        }
        if (mat.isMeshStandardMaterial && !mat.__nkNorm) { mat.roughness = Math.max(mat.roughness, 0.62); mat.metalness = 0; mat.__nkNorm = true; }
        return mat;
      };
      m.material = Array.isArray(m.material) ? m.material.map(fix) : fix(m.material);
    });
    return obj;
  });

  /**
   * A placed library model, normalised: piece("hub", {position, rotY(deg), scale | height, scaleXYZ, look, tint}).
   * Pivot normalisation: packs disagree (KayKit base-centre / base-edge / mid-centre, Kenney base-offset), so every
   * piece is re-centred to base-centre (bounds centred on X/Z, bottom at y = 0). Scaling and rotating a piece then
   * never moves it off its spot. center:false keeps the file's own pivot.
   */
  NK.def("piece", function (key, o = {}) {
    const m = NK3D.model(key, { scale: o.scale, height: o.height, shadows: o.shadows });
    if (o.scaleXYZ) m.scale.multiply(new THREE.Vector3(...o.scaleXYZ));
    NK.use("normalise")(m, o);
    if (o.variant) NK.use("atlasVariant")(m, o.variant);
    let out = m;
    if (o.center !== false) {
      const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3());
      m.position.set(-c.x, -b.min.y, -c.z);
      out = new THREE.Group(); out.name = key; out.add(m);
    }
    if (o.position) out.position.set(o.position[0], o.position[1] || 0, o.position[2]);
    if (o.rotY) out.rotation.y = o.rotY * Math.PI / 180;
    return out;
  });

  /** Soft contact-shadow texture (grounds every object even when shadow maps are low-res or off). */
  NK.def("blobTexture", () => shared("blobTex", () => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.45, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }));
  NK.def("sharedMaterial", shared);

  /**
   * Atlas palette swap. KayKit Space Base Bits colours everything from one swatch atlas (8 columns x 4 rows of vertical gradients),
   * so a recolour is a swatch copy: atlasVariant(obj, "white", [[r, c, r2, c2], ...]) paints swatch (r2,c2) over
   * (r,c) in a copy of the atlas and gives obj its own material using it. Used to make tanks white like the
   * reference without leaving the pack's art.
   */
  const VARIANTS = {
    white: [[0, 7, 0, 1], [1, 7, 0, 1], [2, 6, 0, 1], [0, 6, 0, 2]], // oranges → white, brown → light grey
    navy: [[1, 3, "#4a5d92", "#232c48"]],                                                 // gold → navy gradient (hub)
    supply: [[1, 4, "#4a5d92", "#232c48"], [2, 7, "#5a6da2", "#2c3550"]],                  // red cargo → navy (palette)
  };
  function recolour(tex, id) {
    return shared("atlas:" + tex.uuid + ":" + id, () => {
      const img = tex.image, W = img.width, H = img.height, cw = W / 8, ch = H / 4;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      for (const [r, cc, a, b] of VARIANTS[id]) {
        if (typeof a === "string") { // paint a vertical gradient swatch (palette colour, light at the top)
          const gr = g.createLinearGradient(0, r * ch, 0, (r + 1) * ch); gr.addColorStop(0, a); gr.addColorStop(1, b);
          g.fillStyle = gr; g.fillRect(cc * cw, r * ch, cw, ch);
        } else g.drawImage(c, b * cw, a * ch, cw, ch, cc * cw, r * ch, cw, ch);
      }
      const t = new THREE.CanvasTexture(c);
      t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.magFilter = tex.magFilter; t.minFilter = tex.minFilter;
      return t;
    });
  }
  NK.def("atlasVariant", function (obj, id) {
    obj.traverse((m) => {
      if (!m.isMesh || !m.material || !m.material.map) return;
      const src = m.material;
      m.material = shared("av:" + id + ":" + src.uuid, () => { const c = src.clone(); c.map = recolour(src.map, id); return c; });
    });
    return obj;
  });
})();
