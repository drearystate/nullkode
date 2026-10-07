// HUD icons rendered at load from the game's own 3D models (same palette, same light, same angle), so the
// interface pictograms always match the world. Rendered once into a corner of the game canvas and copied out
// before the frame is shown; the cream background is keyed out to transparency.
(() => {
  let cache = null;
  NK.def("renderIcons", function (world, items, size) {
    if (cache) return cache;
    size = size || 112;
    const r = world.renderer, PAL = NK.use("palette");
    const pr = r.getPixelRatio();
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xeef3ff, 0x8a7a55, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    sun.position.set(-3, 5, 4);
    scene.add(sun);
    scene.environment = world.scene.environment;
    scene.environmentIntensity = 0.3;
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    const bg = new THREE.Color(0xf7eedb);
    const saved = { clear: r.getClearColor(new THREE.Color()), alpha: r.getClearAlpha(), vp: r.getViewport(new THREE.Vector4()), sc: r.getScissor(new THREE.Vector4()), st: r.getScissorTest(), sh: r.shadowMap.enabled, auto: r.autoClear };
    const out = {};
    const cv = NK.ui.h("canvas");
    cv.width = cv.height = size;
    const g = cv.getContext("2d", { willReadFrequently: true });
    r.shadowMap.enabled = false;
    r.autoClear = true;
    r.setClearColor(bg, 1);
    for (const it of items) {
      let obj;
      try {
        obj = NK3D.model(it.key, { shadows: false });
        for (const [k, x, y, z, ry, sc] of it.extra || []) { const o = NK3D.model(k, { shadows: false, scale: (sc || 1) * PAL.scaleOf(k) / PAL.scaleOf(it.key) }); o.position.set(x, y, z); o.rotation.y = ry || 0; obj.add(o); }
      } catch (e) { continue; }
      const holder = new THREE.Group();
      holder.add(obj);
      obj.rotation.y = (it.yaw === undefined ? 0 : it.yaw) * Math.PI / 180;
      scene.add(holder);
      const pitch = (it.pitch === undefined ? 32 : it.pitch) * Math.PI / 180, yaw = -0.62;
      const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      holder.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(holder);
      const c = box.getCenter(new THREE.Vector3());
      cam.position.copy(c).addScaledVector(dir, 20);
      cam.lookAt(c);
      cam.updateMatrixWorld(true);
      // fit: project the box corners into camera space
      const inv = cam.matrixWorldInverse;
      let hx = 0, hy = 0;
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
        hx = Math.max(hx, Math.abs(p.x)); hy = Math.max(hy, Math.abs(p.y));
      }
      const h = Math.max(hx, hy) * (it.zoom || 1.08);
      Object.assign(cam, { left: -h, right: h, top: h, bottom: -h });
      cam.updateProjectionMatrix();
      r.setScissorTest(true);
      r.setViewport(0, 0, size / pr, size / pr);
      r.setScissor(0, 0, size / pr, size / pr);
      r.render(scene, cam);
      g.clearRect(0, 0, size, size);
      g.drawImage(r.domElement, 0, r.domElement.height - size, size, size, 0, 0, size, size);
      // key the flat background colour out (soft edge)
      const img = g.getImageData(0, 0, size, size), d = img.data;
      const k = [d[0], d[1], d[2]];
      for (let i = 0; i < d.length; i += 4) {
        const diff = Math.abs(d[i] - k[0]) + Math.abs(d[i + 1] - k[1]) + Math.abs(d[i + 2] - k[2]);
        if (diff < 10) d[i + 3] = 0; else if (diff < 40) d[i + 3] = Math.round(((diff - 10) / 30) * 255);
      }
      g.putImageData(img, 0, 0);
      out[it.id] = cv.toDataURL("image/png");
      scene.remove(holder);
    }
    r.setScissorTest(saved.st);
    r.setScissor(saved.sc);
    r.setViewport(saved.vp);
    r.setClearColor(saved.clear, saved.alpha);
    r.shadowMap.enabled = saved.sh;
    r.autoClear = saved.auto;
    cache = out;
    return out;
  });
})();
