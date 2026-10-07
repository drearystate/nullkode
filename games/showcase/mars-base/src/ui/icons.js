// HUD glyphs (inline SVG, one stroke/fill language: rounded, 24 px grid) + toolbar thumbnails rendered in-engine
// from the same building models the player places, so the toolbar always matches the world.
(function () {
  const svg = (body, vb) => '<svg viewBox="' + (vb || "0 0 24 24") + '" aria-hidden="true">' + body + "</svg>";
  NK.def("ICONS", {
    crystals: svg('<path d="M5 15l3-8 4-3 3 4 1 6-5 5z" fill="#eef1f8"/><path d="M12 4l3 4 1 6-5 5z" fill="#b9c0d4"/><path d="M5 15l3-8 4 7z" fill="#d7dcea"/><path d="M15 17l3-6 3 4-2 4z" fill="#c9cfe0"/>'),
    water: svg('<rect x="7" y="5" width="10" height="16" rx="3.5" fill="#3f8ef5"/><rect x="9" y="2.5" width="6" height="3.5" rx="1" fill="#7fb6ff"/><rect x="9" y="8" width="2.2" height="9" rx="1.1" fill="#9fcaff"/>'),
    energy: svg('<path d="M13.5 2L5 13.5h6l-1.5 8.5L19 10h-6.2z" fill="#ffc531" stroke="#c98a00" stroke-width=".6" stroke-linejoin="round"/>'),
    sun: svg('<circle cx="12" cy="12" r="4.6" fill="#fff"/><g stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g>'),
    ring: svg('<circle cx="12" cy="12" r="8.5" fill="none" stroke="#fff" stroke-width="2"/>'),
    check: svg('<circle cx="12" cy="12" r="9.5" fill="#48e0f0"/><path d="M7.5 12.3l3 3 6-6.3" fill="none" stroke="#14203a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    chevron: svg('<path d="M9 5l7 7-7 7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    pause: svg('<rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="#fff"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="#fff"/>'),
    rotate: svg('<path d="M18.5 9A7 7 0 1 0 19 14" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M19.5 4v5.5H14" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    close: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'),
    place: svg('<path d="M5.5 12.5l4.5 4.5 8.5-9.5" fill="none" stroke="#14203a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    rover: svg('<rect x="4" y="8" width="16" height="7" rx="2" fill="#fff"/><rect x="7" y="5" width="8" height="4" rx="1" fill="#fff"/><circle cx="7" cy="17" r="2.4" fill="#fff"/><circle cx="12" cy="17" r="2.4" fill="#fff"/><circle cx="17" cy="17" r="2.4" fill="#fff"/>'),
  });

  const thumbs = new Map(); // id → dataURL (kept across live edits; models don't change at runtime)
  /**
   * Renders each building into a corner of the game canvas and copies it out right away (same task, so no
   * preserveDrawingBuffer needed). Same renderer = same tone mapping, colour space and antialiasing as the world.
   */
  NK.def("renderThumbs", function (world, ids, bg) {
    const todo = ids.filter((id) => !thumbs.has(id));
    if (!todo.length) return thumbs;
    const r = world.renderer, size = 96, pr = r.getPixelRatio(), px = Math.round(size * pr);
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(bg);
    sc.environment = world.scene.environment;
    sc.add(new THREE.HemisphereLight(0xeeeaff, 0x7a5a56, 1.7));
    const sun = new THREE.DirectionalLight(0xfff0dc, 3.6); sun.position.set(-4, 7, 5); sc.add(sun);
    const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 400);
    const prevVp = r.getViewport(new THREE.Vector4()), prevSc = r.getScissor(new THREE.Vector4()), prevTest = r.getScissorTest();
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = px;
    const g = canvas.getContext("2d");
    for (const id of todo) {
      const obj = NK.use("makeBuilding")(id);
      obj.rotation.y = -0.35;
      sc.add(obj);
      const box = new THREE.Box3().setFromObject(obj), sph = box.getBoundingSphere(new THREE.Sphere());
      const d = sph.radius / Math.sin((cam.fov * Math.PI) / 360) * 0.74;
      cam.position.set(sph.center.x + d * 0.42, sph.center.y + d * 0.5, sph.center.z + d * 0.76);
      cam.lookAt(sph.center.x, sph.center.y - sph.radius * 0.06, sph.center.z);
      r.setViewport(0, 0, size, size); r.setScissor(0, 0, size, size); r.setScissorTest(true);
      r.render(sc, cam);
      g.clearRect(0, 0, px, px);
      g.drawImage(r.domElement, 0, r.domElement.height - px, px, px, 0, 0, px, px);
      thumbs.set(id, canvas.toDataURL("image/png"));
      sc.remove(obj);
    }
    r.setViewport(prevVp); r.setScissor(prevSc); r.setScissorTest(prevTest);
    return thumbs;
  });
})();
