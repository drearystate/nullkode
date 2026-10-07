// The game's "look": one material treatment for every pack, palette normalisation and shared FX textures.
//
// Palette normalisation: KayKit models are coloured by small gradient palette textures, so a whole pack can be
// re-graded by editing the palette once. The dungeon palette's neutral greys are pushed toward cool slate blue
// (the reference's stone) while warm woods, gold and banner reds stay. The knight's red swatches turn royal blue
// (the reference's tabard and shield). Everything ends up matte (roughness 0.8+, no metal) so no pack looks glossier
// than another.
(function () {
  const T = THREE;
  const done = new WeakSet(); // gltf scenes already normalised (the asset cache outlives live edits)
  const cache = {};

  /** Pixel pass over an image: fn(r,g,b,h,s,l) → [r,g,b] or null to keep. Returns a glTF-ready texture. */
  function repaint(image, fn) {
    const w = image.width, h = image.height;
    const c = NK.ui.h("canvas", { width: String(w), height: String(h) });
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, ch = mx - mn;
      const s = ch === 0 ? 0 : ch / (1 - Math.abs(2 * l - 1));
      let hue = 0;
      if (ch) hue = mx === r ? ((gg - b) / ch) % 6 : mx === gg ? (b - r) / ch + 2 : (r - gg) / ch + 4;
      hue = (hue * 60 + 360) % 360;
      const out = fn(r, gg, b, hue, s, l);
      if (out) { d[i] = Math.max(0, Math.min(255, out[0] * 255)); d[i + 1] = Math.max(0, Math.min(255, out[1] * 255)); d[i + 2] = Math.max(0, Math.min(255, out[2] * 255)); }
    }
    g.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c);
    t.flipY = false;
    t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  function hsl(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)];
  }

  const Look = {
    /** Shared matte material for the whole dungeon pack, with the slate-graded palette. */
    stone(src) {
      if (cache.stone) return cache.stone;
      const tex = repaint(src.image, (r, g, b, h, s, l) => {
        if (s < 0.22 || l < 0.12) return [r * 0.58, g * 0.66, b * 0.86]; // greys → darker slate blue
        if (h > 8 && h < 45 && s > 0.3) { const m = (r + g + b) / 3; return [(r * 0.7 + m * 0.3) * 0.72, (g * 0.7 + m * 0.3) * 0.68, (b * 0.7 + m * 0.3) * 0.68]; } // woods: deeper, desaturated (the reference's brown crates)
        return null;
      });
      cache.stone = new T.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0, name: "stone" });
      return cache.stone;
    },
    /** The knight's palette with its reds turned royal blue. */
    knight(src) {
      if (cache.knight) return cache.knight;
      const tex = repaint(src.image, (r, g, b, h, s, l) => ((h < 14 || h > 330) && s > 0.42 ? hsl(219, Math.min(1, s * 0.85), l * 0.92) : null));
      cache.knight = new T.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0, name: "knight" });
      return cache.knight;
    },
    /** The knight's torso: steel plates become a royal-blue tabard (helmet, arms and legs stay silver). */
    knightBody(src) {
      if (cache.knightBody) return cache.knightBody;
      const tex = repaint(src.image, (r, g, b, h, s, l) => {
        if ((h < 14 || h > 330) && s > 0.42) return hsl(219, Math.min(1, s * 0.85), l * 0.92);
        if (h > 185 && h < 215 && s < 0.3 && l > 0.22 && l < 0.72) return hsl(220, 0.58, Math.min(0.5, l * 0.78));
        return null;
      });
      cache.knightBody = new T.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0, name: "knight-body" });
      return cache.knightBody;
    },
    /** The mage's palette with its purples/magentas turned to the reference's deep blue (hat and robe). */
    mage(src) {
      if (cache.mage) return cache.mage;
      const tex = repaint(src.image, (r, g, b, h, s, l) => {
        if (h > 228 && h < 300 && s > 0.12) return hsl(219, Math.min(0.62, s * 2.1), Math.min(0.6, l * 1.18)); // violet robe + hat → deep blue
        if (h > 300 && h < 345 && s > 0.4) return hsl(32, 0.55, l * 0.95); // magenta trims → warm leather
        if (h > 90 && h < 165 && s > 0.3) return hsl(188, Math.min(1, s * 1.2), Math.min(0.72, l * 1.15)); // green gem → arcane cyan
        return null;
      });
      cache.mage = new T.MeshStandardMaterial({ map: tex, roughness: 0.68, metalness: 0, name: "mage" });
      return cache.mage;
    },
    /** A palette texture loaded as an image asset (e.g. a KayKit alt texture), made glTF-ready. */
    altMaterial(key) {
      if (cache[key]) return cache[key];
      const src = NK3D.texture(key);
      if (!src) return null;
      const t = src.clone();
      t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true;
      cache[key] = new T.MeshStandardMaterial({ map: t, roughness: 0.68, metalness: 0, name: key });
      return cache[key];
    },
    /**
     * Normalises every loaded model once: dungeon-pack → shared slate material; characters and other props →
     * matte versions of their own palettes (same roughness family), skeleton eye glow kept.
     */
    prepare() {
      const man = NK.assets.manifest();
      let stoneSrc = null;
      for (const key of Object.keys(man)) {
        const id = man[key].id || "";
        if (!/^kaykit\//.test(id) || /\/textures\//.test(id)) continue;
        let g;
        try { g = NK3D.gltf(key); } catch (e) { continue; }
        if (done.has(g.scene)) continue;
        done.add(g.scene);
        const dungeon = id.indexOf("kaykit/dungeon-pack/") === 0;
        g.scene.traverse((m) => {
          if (!m.isMesh) return;
          const mat = m.material;
          if (dungeon) {
            if (!stoneSrc && mat.map) stoneSrc = mat.map;
            if (mat.map) m.material = Look.stone(stoneSrc || mat.map);
          } else if (/^kaykit\/adventurers\/(characters\/knight|sword|shield)/.test(id) && mat.map) {
            m.material = m.name === "Knight_Body" ? Look.knightBody(mat.map) : Look.knight(mat.map);
          } else if (mat.isMeshStandardMaterial) {
            if (mat.emissive && mat.emissive.getHex() > 0) { mat.emissiveIntensity = 2.2; return; } // skeleton eyes
            mat.roughness = Math.max(mat.roughness, 0.7);
            mat.metalness = 0;
          }
        });
      }
      for (const key of ["mage", "staff"]) {
        try { NK3D.gltf(key).scene.traverse((m) => { if (m.isMesh && m.material.map) m.material = Look.mage(m.material.map); }); } catch (e) { /* not loaded */ }
      }
    },
    /** Soft radial glow (white centre → transparent), for sprites, point sprites and light-pool decals. */
    glow() {
      if (cache.glow) return cache.glow;
      const c = NK.ui.h("canvas", { width: "128", height: "128" });
      const g = c.getContext("2d");
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.22, "rgba(255,255,255,0.62)");
      gr.addColorStop(0.5, "rgba(255,255,255,0.22)");
      gr.addColorStop(0.78, "rgba(255,255,255,0.06)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      cache.glow = new T.CanvasTexture(c);
      cache.glow.colorSpace = T.SRGBColorSpace;
      return cache.glow;
    },
    /** Additive unlit material (flames, glows, magic). */
    additive(color, opacity, map) {
      return new T.MeshBasicMaterial({ color, transparent: true, opacity: opacity === undefined ? 1 : opacity, blending: T.AdditiveBlending, depthWrite: false, map: map || null, toneMapped: false });
    },
    /** Attaches a model to a rig's hand slot ("handslotr" / "handslotl"). */
    hold(character, key, slot, o) {
      const bone = character.model.getObjectByName(slot);
      if (!bone) return null;
      const m = NK3D.model(key, { shadows: true });
      o = o || {};
      if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
      if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
      if (o.scale) m.scale.multiplyScalar(o.scale);
      bone.add(m);
      return m;
    },
  };
  NK.def("Look", Look);
})();
