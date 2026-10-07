// Minimap (bottom-right): rotated to the camera yaw so "up" on the map is "up" on screen. Navy base, terrain
// features in muted rust, buildings as white blocks, crystals cyan, rover cyan arrow, view area outline.
// Tap/click to move the camera there.
NK.def("Minimap", function (scene, o) {
  const h = NK.ui.h, P = NK.use("PALETTE");
  const wrap = h("div", { class: "mb-panel", "data-mb-minimap": "1", style: "position:absolute;right:calc(16px*var(--u));bottom:calc(16px*var(--u));width:calc(176px*var(--u));height:calc(176px*var(--u));padding:calc(8px*var(--u));pointer-events:auto;cursor:pointer" });
  const cv = h("canvas", { width: "320", height: "320", style: "width:100%;height:100%;display:block;border-radius:calc(6px*var(--u))" });
  wrap.appendChild(cv);
  o.hud.el.appendChild(wrap);
  const g = cv.getContext("2d");
  const R = 36; // metres from the map centre to its edge
  const C = new THREE.Vector2(o.center[0], o.center[1]);
  const yaw = o.yaw * Math.PI / 180;
  // world (x,z) → canvas px: rotate by camera yaw so the camera's forward points up
  const toMap = (x, z) => {
    const dx = x - C.x, dz = z - C.y;
    const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw), rz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    return [160 + (rx / R) * 160, 160 + (rz / R) * 160];
  };
  const toWorld = (px, py) => {
    const rx = ((px - 160) / 160) * R, rz = ((py - 160) / 160) * R;
    return [C.x + rx * Math.cos(yaw) + rz * Math.sin(yaw), C.y - rx * Math.sin(yaw) + rz * Math.cos(yaw)];
  };
  // static layer: navy base + rust ground patches (smoothed from a 48x48 sample) + rocks, drawn once
  const base = document.createElement("canvas"); base.width = base.height = 320;
  (function () {
    const lo = document.createElement("canvas"); lo.width = lo.height = 48;
    const l = lo.getContext("2d"), img = l.createImageData(48, 48), G = o.ground;
    for (let j = 0; j < 48; j++) for (let i = 0; i < 48; i++) {
      const [x, z] = toWorld((i + 0.5) * 320 / 48, (j + 0.5) * 320 / 48);
      const c = G.crater(x, z), n = Math.sin(x * 0.13 + Math.sin(z * 0.11) * 2.2) * Math.cos(z * 0.12 - x * 0.04);
      const rust = Math.min(1, Math.max(0, (n - 0.15) * 1.6) + (c.inside > 0 ? 0.55 : 0) + Math.max(0, Math.hypot(x - C.x, z - C.y) / R - 0.85) * 1.5);
      const k = (j * 48 + i) * 4;
      img.data[k] = 38 + rust * (128 - 38); img.data[k + 1] = 43 + rust * (78 - 43); img.data[k + 2] = 66 + rust * (70 - 66); img.data[k + 3] = 255;
    }
    l.putImageData(img, 0, 0);
    const b = base.getContext("2d"); b.imageSmoothingEnabled = true; b.drawImage(lo, 0, 0, 320, 320);
    b.fillStyle = "rgba(150,96,86,.9)";
    for (const r of o.rocks) { const [px, py] = toMap(r[0], r[1]); b.beginPath(); b.arc(px, py, Math.max(4, r[2] * 4.2), 0, Math.PI * 2); b.fill(); }
  })();
  const view = [];
  const dot = (x, z, r, fill) => { const [px, py] = toMap(x, z); g.fillStyle = fill; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); };
  const api = {
    draw() {
      g.drawImage(base, 0, 0);
      // power line
      if (o.cable) { g.strokeStyle = o.powered() ? "#ffd25a" : "rgba(255,210,90,.35)"; g.lineWidth = 3; g.beginPath(); o.cable.forEach(([x, z], i) => { const [px, py] = toMap(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); }
      // structures
      for (const s of o.structures()) {
        const [px, py] = toMap(s.x, s.z), w = Math.max(9, s.r * 4.6);
        g.fillStyle = s.kind === "pad" ? "#59607c" : s.kind === "solar" ? "#5b8cff" : "#f1f3fa";
        g.beginPath(); g.roundRect ? g.roundRect(px - w / 2, py - w / 2, w, w, 3) : g.rect(px - w / 2, py - w / 2, w, w); g.fill();
      }
      // crystals
      const d = o.deposit; const [cx, cy] = toMap(d.x, d.z);
      g.fillStyle = "#48e0f0"; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx + 7, cy); g.lineTo(cx, cy + 9); g.lineTo(cx - 7, cy); g.closePath(); g.fill();
      // socket (objective 1)
      if (o.socket()) { const s = o.socket(); const t = performance.now() / 400; g.strokeStyle = "rgba(72,224,240," + (0.5 + Math.sin(t) * 0.4).toFixed(2) + ")"; g.lineWidth = 2.5; const [sx, sy] = toMap(s.x, s.z); g.beginPath(); g.arc(sx, sy, 8, 0, Math.PI * 2); g.stroke(); }
      // rover arrow
      const rv = o.rover.object; const [rx, ry] = toMap(rv.position.x, rv.position.z);
      const a = Math.PI - rv.rotation.y + yaw; // rover forward in map space
      g.save(); g.translate(rx, ry); g.rotate(a); g.fillStyle = "#48e0f0"; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.restore();
      // camera view outline (ground footprint of the screen corners)
      const rig = o.rig; view.length = 0;
      for (const [sx, sy] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const p = rig.groundAt(innerWidth * sx, innerHeight * sy); if (p) view.push(toMap(p.x, p.z)); }
      if (view.length === 4) { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; g.beginPath(); view.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.stroke(); }
      void dot; void P;
    },
  };
  const tap = (e) => { e.stopPropagation(); const r = cv.getBoundingClientRect(); const [x, z] = toWorld(((e.clientX - r.left) / r.width) * 320, ((e.clientY - r.top) / r.height) * 320); o.rig.lookAt(x, z); };
  cv.addEventListener("pointerdown", tap);
  return api;
});
