// Colony HUD (DOM through NK.ui): resources top-left, sol + pause top-right, objective under it, build toolbar
// bottom-centre, minimap bottom-right (src/ui/minimap.js). One panel style: navy glass, 1 px light edge, 10 px radius.
// Everything scales with --u (1 at 1672x941, down to about 0.6 on phones).
NK.def("Hud", function (scene, o) {
  const I = NK.use("ICONS"), h = NK.ui.h, root = NK.ui.root();
  const css = h("style", { text: `
.mb{position:absolute;inset:0;pointer-events:none;font-family:"Segoe UI","SF Pro Text",-apple-system,Roboto,"Helvetica Neue","Liberation Sans",Arial,sans-serif;color:#f3f5fb;--u:1}
.mb *{box-sizing:border-box}
.mb svg{display:block;width:100%;height:100%}
.mb-panel{background:rgba(27,32,52,.9);border:1px solid rgba(160,175,220,.16);border-radius:calc(10px*var(--u));box-shadow:0 calc(4px*var(--u)) calc(14px*var(--u)) rgba(20,10,20,.28)}
.mb-res{position:absolute;left:calc(16px*var(--u));top:calc(12px*var(--u));display:flex;align-items:center;height:calc(46px*var(--u));padding:0 calc(6px*var(--u))}
.mb-res .it{display:flex;align-items:center;gap:calc(10px*var(--u));padding:0 calc(16px*var(--u));height:100%;position:relative}
.mb-res .it+.it{border-left:1px solid rgba(160,175,220,.16)}
.mb-res i{width:calc(26px*var(--u));height:calc(26px*var(--u));flex:none}
.mb-res b{font-size:max(15px,calc(20px*var(--u)));font-weight:600;min-width:calc(38px*var(--u));font-variant-numeric:tabular-nums;letter-spacing:.2px}
.mb-res .full b{color:#ffb36b}
.mb-pop{position:absolute;left:calc(52px*var(--u));top:calc(-4px*var(--u));font-size:max(11px,calc(15px*var(--u)));font-weight:700;color:#7ff0ff;animation:mbpop .9s ease-out forwards;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.mb-pop.neg{color:#ffb36b}
@keyframes mbpop{from{transform:translateY(0);opacity:1}to{transform:translateY(calc(-26px*var(--u)));opacity:0}}
.mb-tr{position:absolute;right:calc(16px*var(--u));top:calc(12px*var(--u));display:flex;flex-direction:column;align-items:flex-end;gap:calc(12px*var(--u))}
.mb-row{display:flex;gap:calc(8px*var(--u))}
.mb-sol{display:flex;align-items:center;gap:calc(12px*var(--u));height:calc(46px*var(--u));padding:0 calc(16px*var(--u)) 0 calc(14px*var(--u));font-size:max(15px,calc(20px*var(--u)));font-weight:600;letter-spacing:.5px}
.mb-sol i{width:calc(24px*var(--u));height:calc(24px*var(--u))}
.mb-sol .bar{position:absolute}
.mb-btn{pointer-events:auto;cursor:pointer;width:calc(46px*var(--u));height:calc(46px*var(--u));display:flex;align-items:center;justify-content:center;padding:calc(11px*var(--u));color:#fff;font:inherit}
.mb-btn:hover{border-color:rgba(72,224,240,.6)}
.mb-obj{pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:calc(12px*var(--u));min-height:calc(50px*var(--u));padding:calc(8px*var(--u)) calc(12px*var(--u)) calc(8px*var(--u)) calc(14px*var(--u));max-width:calc(380px*var(--u))}
.mb-obj>i{width:calc(22px*var(--u));height:calc(22px*var(--u));flex:none}
.mb-obj .tx{display:flex;flex-direction:column;gap:calc(2px*var(--u))}
.mb-obj .t{font-size:max(11px,calc(16px*var(--u)));font-weight:600;white-space:nowrap}
.mb-obj .s{font-size:max(10px,calc(13px*var(--u)));color:#aeb6cf;display:none;white-space:nowrap}
.mb-obj.open .s{display:block}
.mb-obj .ch{width:calc(16px*var(--u));height:calc(16px*var(--u));flex:none;margin-left:calc(4px*var(--u));transition:transform .2s}
.mb-obj.open .ch{transform:rotate(90deg)}
.mb-obj.done{border-color:rgba(72,224,240,.75)}
.mb-obj.flash{animation:mbflash .7s ease-out}
@keyframes mbflash{0%{box-shadow:0 0 0 0 rgba(72,224,240,.7)}100%{box-shadow:0 0 0 calc(14px*var(--u)) rgba(72,224,240,0)}}
.mb-bar{--s:max(0.6,var(--u));position:absolute;left:50%;bottom:calc(16px*var(--s));transform:translateX(-50%);display:flex;gap:calc(10px*var(--s));padding:calc(10px*var(--s));pointer-events:auto}
.mb-slot{position:relative;width:calc(114px*var(--s));height:calc(104px*var(--s));border-radius:calc(8px*var(--s));background:#2f3550;border:1px solid rgba(160,175,220,.14);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:calc(10px*var(--s));cursor:pointer;color:#fff;font:inherit;transition:transform .08s,border-color .12s}
.mb-slot:hover{border-color:rgba(160,175,220,.45)}
.mb-slot:active{transform:translateY(1px)}
.mb-slot img{position:absolute;left:50%;top:calc(4px*var(--s));width:calc(74px*var(--s) - 4px);height:calc(74px*var(--s) - 4px);transform:translateX(-50%);border-radius:calc(6px*var(--s));pointer-events:none}
.mb-slot .k{position:absolute;right:calc(12px*var(--s));top:calc(52px*var(--s));width:calc(21px*var(--s));height:calc(21px*var(--s));border-radius:calc(5px*var(--s));background:#3d8ef0;font-size:max(10px,calc(13px*var(--s)));font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 0 rgba(0,0,0,.25)}
.mb-slot .n{position:relative;z-index:1;font-size:max(10px,calc(13.5px*var(--s)));font-weight:600;white-space:nowrap}
.mb-slot.sel{border-color:#48e0f0;box-shadow:0 0 0 1px #48e0f0,0 0 calc(14px*var(--s)) rgba(72,224,240,.35)}
.mb-slot.poor img{opacity:.45;filter:grayscale(.6)}
.mb-slot.poor .n{color:#aeb6cf}
.mb-info{position:absolute;left:50%;bottom:calc(150px*var(--u));transform:translateX(-50%);display:none;align-items:center;gap:calc(14px*var(--u));padding:calc(8px*var(--u)) calc(8px*var(--u)) calc(8px*var(--u)) calc(16px*var(--u));pointer-events:auto;white-space:nowrap}
.mb-info.on{display:flex}
.mb-info .nm{font-size:max(11px,calc(16px*var(--u)));font-weight:600}
.mb-info .cost{display:flex;gap:calc(10px*var(--u));font-size:max(11px,calc(15px*var(--u)));font-weight:600}
.mb-info .cost span{display:flex;align-items:center;gap:calc(4px*var(--u))}
.mb-info .cost i{width:calc(18px*var(--u));height:calc(18px*var(--u))}
.mb-info .cost .no{color:#ffb36b}
.mb-info .ds{font-size:max(10px,calc(13px*var(--u)));color:#aeb6cf}
.mb-info .st{font-size:max(10px,calc(13px*var(--u)));font-weight:600;color:#48e0f0}
.mb-info .st.bad{color:#ffb36b}
.mb-chip{display:flex;align-items:center;gap:calc(6px*var(--u));height:calc(34px*var(--u));padding:0 calc(12px*var(--u)) 0 calc(9px*var(--u));border-radius:calc(8px*var(--u));background:#3a4262;border:0;color:#fff;font:inherit;font-size:max(10px,calc(13px*var(--u)));font-weight:600;cursor:pointer}
.mb-chip i{width:calc(18px*var(--u));height:calc(18px*var(--u))}
.mb-chip.ok{background:#48e0f0;color:#14203a}
.mb-chip.ok:disabled{opacity:.4;cursor:default}
.mb-hint{position:absolute;left:50%;top:calc(70px*var(--u));transform:translateX(-50%);padding:calc(8px*var(--u)) calc(16px*var(--u));font-size:max(10px,calc(14px*var(--u)));font-weight:600;display:none;white-space:nowrap}
.mb-hint.on{display:block;animation:nkfade .2s ease-out}
/* kit toasts move to the top centre: the bottom belongs to the toolbar */
.nk-toast{bottom:auto!important;top:calc(84px + 1vh);border:1px solid rgba(160,175,220,.16);background:rgba(27,32,52,.92)!important}
@media (max-width:1000px){.mb-info .ds{display:none}}
@media (max-aspect-ratio:1/1){.mb [data-mb-minimap]{bottom:calc(160px*max(0.6,var(--u)))!important}}
@media (max-height:480px){.mb-obj .s{display:none!important}}
@media (max-width:600px){.mb-info .ds,.mb-info .cost{display:none}.mb-obj{max-width:calc(100vw - 32px)}}
` });
  const el = h("div", { class: "mb", "data-mb-hud": "1" });
  root.appendChild(css); root.appendChild(el);
  const res = {}, slots = {};
  const icon = (svg) => { const i = h("i"); i.innerHTML = svg; return i; };

  // ---- resources (top-left)
  const resBox = h("div", { class: "mb-res mb-panel" });
  for (const k of ["crystals", "water", "energy"]) {
    const v = h("b", { text: "0" }), it = h("div", { class: "it", title: k[0].toUpperCase() + k.slice(1) }, [icon(I[k]), v]);
    res[k] = { v, it }; resBox.appendChild(it);
  }
  el.appendChild(resBox);

  // ---- sol + pause, objective (top-right)
  const solTxt = h("span", { text: "SOL 07" });
  const pauseBtn = h("button", { class: "mb-btn mb-panel", "aria-label": "Pause", "data-nk-action": "pause", onclick: () => NK.pause() }); pauseBtn.innerHTML = I.pause;
  const solBox = h("div", { class: "mb-sol mb-panel" }, [icon(I.sun), solTxt]);
  const objIcon = icon(I.ring), objT = h("div", { class: "t" }), objS = h("div", { class: "s" });
  const obj = h("div", { class: "mb-obj mb-panel", role: "button", "aria-label": "Objective (tap for a hint)" }, [objIcon, h("div", { class: "tx" }, [objT, objS]), icon(I.chevron)]);
  obj.lastChild.className = "ch";
  obj.addEventListener("click", () => obj.classList.toggle("open"));
  el.appendChild(h("div", { class: "mb-tr" }, [h("div", { class: "mb-row" }, [pauseBtn, solBox]), obj]));

  // ---- placement info card + build toolbar (bottom-centre)
  const infoName = h("span", { class: "nm" }), infoCost = h("span", { class: "cost" }), infoDesc = h("span", { class: "ds" }), infoState = h("span", { class: "st" });
  const chip = (label, svg, cls, fn) => { const b = h("button", { class: "mb-chip " + (cls || ""), onclick: fn }, [icon(svg), label]); return b; };
  const rotBtn = chip("Rotate", I.rotate, "", () => o.onRotate && o.onRotate());
  const cancelBtn = chip("Cancel", I.close, "", () => o.onCancel && o.onCancel());
  const placeBtn = chip("Place", I.place, "ok", () => o.onConfirm && o.onConfirm());
  const info = h("div", { class: "mb-info mb-panel" }, [infoName, infoCost, infoDesc, infoState, rotBtn, cancelBtn, placeBtn]);
  el.appendChild(info);
  const bar = h("div", { class: "mb-bar mb-panel" });
  o.buildings.forEach((b, i) => {
    const img = h("img", { alt: "", draggable: "false" });
    const s = h("button", { class: "mb-slot", "data-mb-build": b.id, "aria-label": b.name + " (" + (i + 1) + ")", onclick: () => o.onSelect && o.onSelect(b.id) }, [img, h("span", { class: "k", text: String(i + 1) }), h("span", { class: "n", text: b.name })]);
    slots[b.id] = { s, img }; bar.appendChild(s);
  });
  el.appendChild(bar);
  const hint = h("div", { class: "mb-hint mb-panel" });
  el.appendChild(hint);

  // ---- scaling with the viewport
  const fit = () => { const u = Math.max(0.5, Math.min(1, Math.min(innerWidth / 1672, innerHeight / 941) * 1.12)); el.style.setProperty("--u", u.toFixed(3)); };
  fit(); window.addEventListener("resize", fit);
  scene.onDispose(() => { window.removeEventListener("resize", fit); el.remove(); css.remove(); });

  const fmt = (n) => String(Math.floor(n));
  const api = {
    el, bar,
    setThumbs(map) { for (const id in slots) if (map.get(id)) slots[id].img.src = map.get(id); },
    setResources(r, cap) { for (const k in res) { res[k].v.textContent = fmt(r[k]); res[k].it.classList.toggle("full", r[k] >= cap); } },
    pop(k, n) {
      if (!res[k] || !n) return;
      const p = h("span", { class: "mb-pop" + (n < 0 ? " neg" : ""), text: (n > 0 ? "+" : "") + Math.round(n) });
      p.addEventListener("animationend", () => p.remove());
      res[k].it.appendChild(p);
    },
    setSol(n) { solTxt.textContent = "SOL " + String(n).padStart(2, "0"); },
    setObjective(text, sub, done) {
      objT.textContent = text; objS.textContent = sub || "";
      objIcon.innerHTML = done ? I.check : I.ring;
      obj.classList.toggle("done", !!done);
      obj.classList.remove("flash"); void obj.offsetWidth; obj.classList.add("flash");
    },
    /** Shows/hides the objective's hint line (opened briefly when an objective starts; tap toggles). */
    openObjective(on) { obj.classList.toggle("open", !!on); },
    setSelected(id) { for (const k in slots) slots[k].s.classList.toggle("sel", k === id); },
    setAffordable(map) { for (const k in slots) slots[k].s.classList.toggle("poor", !map[k]); },
    /** Placement card: info = {name, cost:{crystals,...}, have:{...}, desc, status, ok, touch} or null. */
    setPlacing(p) {
      info.classList.toggle("on", !!p);
      if (!p) return;
      infoName.textContent = p.name;
      infoCost.innerHTML = "";
      for (const k in p.cost) { const s = h("span", { class: p.have[k] >= p.cost[k] ? "" : "no" }, [icon(I[k]), String(p.cost[k])]); infoCost.appendChild(s); }
      infoDesc.textContent = p.desc;
      infoState.textContent = p.status || ""; infoState.classList.toggle("bad", !p.ok);
      placeBtn.style.display = p.touch ? "" : "none"; placeBtn.disabled = !p.ok;
    },
    hint(text) { hint.textContent = text || ""; hint.classList.toggle("on", !!text); },
  };
  return api;
});
