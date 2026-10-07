// The HUD, one visual system: slate panels with a cool 2 px border, Kenney Future numerals, and Kenney
// board-game-icon silhouettes tinted by CSS masks (steel sword, cyan bolt, blue shield, red potion, red hearts).
//   top-left: hearts (half-heart damage) · top-right: minimap + floor, objective below it, pause button
//   bottom-centre: ability bar 1-4 with cooldown sweeps (tappable: it doubles as the potion button on phones)
NK.def("Hud", function (scene, opts) {
  const h = NK.ui.h, url = (k) => NK.assets.url(k, ["png", "webp"]) || "";
  const root = NK.ui.root();
  const css = `
.vh{position:absolute;inset:0;pointer-events:none;font-family:'Kenney Future',system-ui,sans-serif;color:#e8edff;z-index:5}
.vh-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(0,0,0,0) 55%,rgba(4,5,12,.42) 85%,rgba(2,3,8,.7) 100%)}
.vh-mask{position:absolute;inset:0;-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center}
.vh-hearts{position:absolute;left:calc(20px + env(safe-area-inset-left));top:calc(18px + env(safe-area-inset-top));display:flex;gap:7px;filter:drop-shadow(0 2px 0 rgba(0,0,0,.65)) drop-shadow(0 0 6px rgba(0,0,0,.4))}
.vh-heart{position:relative;width:44px;height:40px;transition:transform .15s}
.vh-heart.bump{transform:scale(1.18)}
.vh-heart .bg{background:#3a1820}
.vh-heart .fill{background:linear-gradient(170deg,#ff8a8a 0%,#f0303c 38%,#b0101c 100%)}
.vh-heart .shine{background:linear-gradient(160deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 32%)}
.vh-tr{position:absolute;right:calc(18px + env(safe-area-inset-right));top:calc(16px + env(safe-area-inset-top));display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.vh-panel{background:linear-gradient(180deg,rgba(32,40,62,.92),rgba(17,22,38,.92));border:2px solid #4a5a84;border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 4px 14px rgba(0,0,0,.45)}
.vh-map{position:relative;width:196px;height:170px;padding:0;overflow:hidden}
.vh-map canvas{position:absolute;inset:0;width:100%;height:100%}
.vh-floor{position:absolute;right:9px;top:6px;font-size:15px;letter-spacing:.5px;color:#dfe6ff;text-shadow:0 2px 0 rgba(0,0,0,.6)}
.vh-floor b{font-weight:normal;color:#fff}
.vh-goal{display:flex;align-items:center;gap:11px;padding:9px 16px 9px 13px;font-size:15px;white-space:nowrap;min-width:196px}
.vh-dia{width:13px;height:13px;transform:rotate(45deg);border:2.5px solid #f2b84b;flex:none;box-shadow:0 0 6px rgba(242,184,75,.45)}
.vh-goal.done .vh-dia{background:#f2b84b}
.vh-goal.flash{animation:vhflash .5s ease-out 2}
@keyframes vhflash{50%{border-color:#f2b84b;box-shadow:0 0 18px rgba(242,184,75,.6)}}
.vh-pause{pointer-events:auto;position:absolute;right:calc(226px + env(safe-area-inset-right));top:calc(16px + env(safe-area-inset-top));width:42px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.vh-pause img{width:24px;height:24px;opacity:.9}
.vh-bar{position:absolute;left:50%;bottom:calc(30px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:13px}
.vh-slot{position:relative;width:66px;height:66px;pointer-events:auto;cursor:pointer;touch-action:none;transition:transform .08s,border-color .15s}
.vh-slot.on{transform:translateY(2px);border-color:#9fb6ff;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 14px rgba(120,160,255,.45)}
.vh-slot.deny{animation:vhdeny .3s}
@keyframes vhdeny{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.vh-ico{position:absolute;left:11px;top:11px;width:44px;height:44px}
.vh-cd{position:absolute;inset:0;border-radius:8px;pointer-events:none}
.vh-key{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);width:24px;height:24px;border-radius:6px;background:#141a2e;border:2px solid #4a5a84;font-size:13px;line-height:20px;text-align:center;color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.5)}
.vh-count{position:absolute;right:-7px;top:-7px;min-width:21px;height:21px;padding:0 4px;border-radius:11px;background:#8f1a28;border:2px solid #ff8a96;font-size:11px;line-height:17px;text-align:center;color:#fff}
.vh-hint{position:absolute;left:50%;bottom:calc(122px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:8px 16px;font-size:14px;white-space:nowrap;opacity:0;transition:opacity .3s}
.vh-hint.show{opacity:1}
.vh-touch .vh-slot{width:58px;height:58px}.vh-touch .vh-ico{left:9px;top:9px;width:38px;height:38px}
.vh-touch .vh-bar{bottom:calc(22px + env(safe-area-inset-bottom));gap:10px}
.vh-touch .vh-hint{bottom:calc(104px + env(safe-area-inset-bottom))}
@media (max-height:500px){.vh-map{width:124px;height:104px}.vh-goal{min-width:124px;font-size:10px;padding:5px 8px;gap:7px}.vh-dia{width:9px;height:9px;border-width:2px}.vh-floor{font-size:10px}.vh-heart{width:30px;height:27px}.vh-pause{right:calc(150px + env(safe-area-inset-right));width:36px;height:36px}.vh-hint{font-size:11px;padding:6px 12px}}
`;
  const style = h("style", { text: css });
  const el = h("div", { class: "vh" });
  root.appendChild(style); root.appendChild(el);
  const mask = (key, cls, extra) => { const u = url(key); const d = h("div", { class: "vh-mask " + (cls || ""), style: `-webkit-mask-image:url('${u}');mask-image:url('${u}');${extra || ""}` }); return d; };

  el.appendChild(h("div", { class: "vh-vig" }));
  // hearts
  const hearts = h("div", { class: "vh-hearts" });
  const heartEls = [];
  for (let i = 0; i < 3; i++) {
    const fill = mask("icon-heart", "fill");
    const hh = h("div", { class: "vh-heart" }, [mask("icon-heart", "bg"), fill, mask("icon-heart", "shine")]);
    heartEls.push({ el: hh, fill });
    hearts.appendChild(hh);
  }
  el.appendChild(hearts);
  // minimap + objective
  const tr = h("div", { class: "vh-tr" });
  const canvas = h("canvas", { width: "392", height: "340" });
  const floor = h("div", { class: "vh-floor" }, ["Floor ", h("b", { text: "03" })]);
  const map = h("div", { class: "vh-panel vh-map" }, [canvas, floor]);
  const goalText = h("span", { text: "Find the vault" });
  const goal = h("div", { class: "vh-panel vh-goal" }, [h("div", { class: "vh-dia" }), goalText]);
  tr.appendChild(map); tr.appendChild(goal);
  el.appendChild(tr);
  const pause = h("button", { class: "vh-panel vh-pause", "aria-label": "Pause", "data-nk-action": "pause", onclick: () => NK.pause() }, [h("img", { src: url("icon-pause"), alt: "" })]);
  el.appendChild(pause);
  // ability bar
  const bar = h("div", { class: "vh-bar" });
  const SLOTS = [
    { action: "attack", key: "1", icon: () => mask("icon-sword", "", "background:linear-gradient(225deg,#ffffff 0%,#c4d0e6 50%,#9aa9c4 62%,#d8a45e 72%,#7b5230 100%)") },
    { action: "bolt", key: "2", icon: () => h("div", { class: "vh-mask", style: "filter:drop-shadow(0 0 6px rgba(80,220,255,.9))" }, [mask("icon-bolt", "", "background:radial-gradient(circle,#ffffff 0%,#b5fbff 22%,#3cc6ff 58%,#1a5fe0 100%)")]) },
    { action: "block", key: "3", icon: () => h("div", { class: "vh-mask" }, [mask("icon-shield", "", "background:linear-gradient(180deg,#d6e3ff 0%,#d6e3ff 9%,#5e97ff 10%,#2a55c0 100%)"), h("div", { style: "position:absolute;left:46%;top:24%;width:9%;height:48%;background:#eef3ff;border-radius:2px" }), h("div", { style: "position:absolute;left:31%;top:39%;width:39%;height:10%;background:#eef3ff;border-radius:2px" })]) },
    { action: "potion", key: "4", icon: () => h("div", { class: "vh-mask" }, [mask("icon-flask", "", "background:linear-gradient(180deg,#ff8aa0 30%,#e8203a 62%,#a80f22 100%)"), mask("icon-flask-glass", "", "background:#f4f7ff;opacity:.95")]) },
  ];
  const slotEls = {};
  SLOTS.forEach((s) => {
    const cd = h("div", { class: "vh-cd" });
    const ico = h("div", { class: "vh-ico" }, [s.icon()]);
    const slot = h("div", { class: "vh-panel vh-slot", "data-nk-control": "slot-" + s.action }, [ico, cd, h("div", { class: "vh-key", text: s.key })]);
    if (s.action === "potion") { s.count = h("div", { class: "vh-count", text: String(NK.run.potions) }); slot.appendChild(s.count); }
    const src = "touch:" + s.action;
    const ids = {};
    const set = () => NK.input.setSource(src, Object.keys(ids).length > 0);
    slot.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); ids[e.pointerId] = 1; try { slot.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ } set(); });
    const up = (e) => { delete ids[e.pointerId]; set(); };
    slot.addEventListener("pointerup", up); slot.addEventListener("pointercancel", up); slot.addEventListener("lostpointercapture", up);
    slotEls[s.action] = { slot, cd, def: s };
    bar.appendChild(slot);
  });
  el.appendChild(bar);
  const hint = h("div", { class: "vh-panel vh-hint" });
  el.appendChild(hint);
  let hintT = 0;
  const touchMode = () => NK.touch.visible();

  // minimap drawing --------------------------------------------------------
  const L = NK.use("level"), g = canvas.getContext("2d");
  const W = 392, H = 340, view = { x0: -27, z0: -25, size: 46 };
  const sc = Math.min(W, H) / view.size;
  const mx = (x) => (x - view.x0) * sc + (W - view.size * sc) / 2, mz = (z) => (z - view.z0) * sc;
  function drawMap(state) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(8,11,22,.55)"; g.fillRect(0, 0, W, H);
    const rect = (r, fill, stroke) => { g.fillStyle = fill; g.fillRect(mx(r[0]), mz(r[1]), r[2] * sc, r[3] * sc); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.strokeRect(mx(r[0]), mz(r[1]), r[2] * sc, r[3] * sc); } };
    L.map.corridors.forEach((r) => rect(r, "#26314d", "#34436a"));
    L.map.rooms.forEach((r, i) => rect(r, i === 2 ? "#4a4330" : "#3d4c72", i === 2 ? "#b8913f" : "#3d4c72"));
    L.map.rooms.forEach((r, i) => { if (i < 2) { g.strokeStyle = "#6b7fb0"; g.lineWidth = 3; g.strokeRect(mx(r[0]), mz(r[1]), r[2] * sc, r[3] * sc); } });
    L.map.rooms.slice(0, 2).forEach((r) => rect([r[0] + 0.4, r[1] + 0.4, r[2] - 0.8, r[3] - 0.8], "#3d4c72"));
    const c = L.channel;
    rect([L.faces.west, c.z0, L.faces.east - L.faces.west, c.z1 - c.z0], "#2a8fa0");
    rect([c.bridge[0], c.z0, c.bridge[1] - c.bridge[0], c.z1 - c.z0], "#3d4c72");
    // vault icon
    const vx = mx(L.vault.x), vz = mz(L.faces.north - 2);
    g.fillStyle = state.vaultOpen ? "#ffe08a" : "#f2b84b"; g.strokeStyle = "#2a1d08"; g.lineWidth = 2;
    g.fillRect(vx - 9, vz - 6, 18, 13); g.strokeRect(vx - 9, vz - 6, 18, 13);
    g.fillStyle = "#2a1d08"; g.fillRect(vx - 9, vz - 1, 18, 2.5); g.fillRect(vx - 2, vz - 1, 4, 5);
    const dot = (p, r, fill, ring) => { g.beginPath(); g.arc(mx(p.x), mz(p.z), r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (ring) { g.lineWidth = 2.5; g.strokeStyle = ring; g.stroke(); } };
    (state.foes || []).forEach((f) => { if (f.alive) dot(f.object.position, 6, "#ff4a4a", "#3a0c10"); });
    if (state.mage) dot(state.mage.object.position, 6, "#5aa0ff", "#0c1830");
    if (state.hero) {
      const p = state.hero.object.position, a = state.hero.facing;
      g.beginPath(); g.moveTo(mx(p.x + Math.sin(a) * 2.2), mz(p.z + Math.cos(a) * 2.2)); g.lineTo(mx(p.x + Math.sin(a + 2.4) * 1.2), mz(p.z + Math.cos(a + 2.4) * 1.2)); g.lineTo(mx(p.x + Math.sin(a - 2.4) * 1.2), mz(p.z + Math.cos(a - 2.4) * 1.2)); g.closePath();
      g.fillStyle = "#7ff6ff"; g.fill(); dot(p, 6.5, "#7ff6ff", "#ffffff");
    }
  }

  const api = {
    el,
    setHearts(hp, max, bump) {
      for (let i = 0; i < 3; i++) {
        const v = Math.max(0, Math.min(2, hp - i * 2)); // 0, 1 (half), 2 (full)
        heartEls[i].fill.style.clipPath = v === 2 ? "none" : v === 1 ? "inset(0 50% 0 0)" : "inset(0 100% 0 0)";
        if (bump) { heartEls[i].el.classList.add("bump"); }
      }
      if (bump) scene.hudBump = 0.18;
    },
    setPotions(n) { const s = slotEls.potion.def; if (s.count) s.count.textContent = String(n); slotEls.potion.slot.style.opacity = n > 0 ? "1" : ".55"; },
    setCooldown(action, frac) { const s = slotEls[action]; if (!s) return; s.cd.style.background = frac > 0.001 ? `conic-gradient(from 0deg, rgba(6,8,18,.58) 0turn ${frac}turn, rgba(0,0,0,0) ${frac}turn)` : "none"; },
    press(action, on) { const s = slotEls[action]; if (s) s.slot.classList.toggle("on", !!on); },
    deny(action) { const s = slotEls[action]; if (!s) return; s.slot.classList.remove("deny"); void s.slot.offsetWidth; s.slot.classList.add("deny"); },
    setObjective(text, done) { if (goalText.textContent !== text) { goalText.textContent = text; goal.classList.remove("flash"); void goal.offsetWidth; goal.classList.add("flash"); } goal.classList.toggle("done", !!done); },
    hint(text, sec) { hint.textContent = text; hint.classList.add("show"); hintT = sec || 3.5; },
    hideHint() { hintT = 0; hint.classList.remove("show"); },
    drawMap,
    update(dt) {
      el.classList.toggle("vh-touch", touchMode());
      if (hintT > 0) { hintT -= dt; if (hintT <= 0) hint.classList.remove("show"); }
      if (scene.hudBump > 0) { scene.hudBump -= dt; if (scene.hudBump <= 0) heartEls.forEach((x) => x.el.classList.remove("bump")); }
    },
    remove() { el.remove(); style.remove(); },
  };
  scene.onDispose(() => api.remove());
  // the world's panels (pause, game over) sit on a clean frame: the HUD steps back
  const vis = () => { el.style.transition = "opacity .25s"; el.style.opacity = NK.state.current === "play" ? "1" : "0"; };
  scene.onDispose(NK.on("state", vis));
  vis();
  return api;
});
