// HUD: compact cream panels with navy text. Resources + goal top-left, day + time controls + menu top-right,
// building toolbar bottom-centre, a one-line hint above it. Built with NK.ui (DOM overlay), styles scoped to .hv-*.
(() => {
  const C = { cream: "#f7eedb", cream2: "#efe3c8", line: "#d8c6a0", navy: "#1f2a44", navy2: "#4a5674", gold: "#e2b04a", goldDeep: "#b8862b", brick: "#b8503a" };
  const svg = (body, w) => "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + (w || 24) + '" height="' + (w || 24) + '">' + body + "</svg>");
  const ink = 'fill="' + C.navy + '"';
  const GLYPH = {
    pause: svg('<rect x="6" y="5" width="4.2" height="14" rx="1.4" ' + ink + '/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" ' + ink + "/>"),
    play: svg('<path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10-6.8c.6-.4.6-1.2 0-1.6l-10-6.8C8.9 3.9 8 4.4 8 5.2z" ' + ink + "/>"),
    fast: svg('<path d="M3.5 6.2v11.6c0 .7.8 1.1 1.4.7l8-5.8c.5-.4.5-1.1 0-1.4l-8-5.8c-.6-.4-1.4 0-1.4.7z" ' + ink + '/><path d="M11.5 6.2v11.6c0 .7.8 1.1 1.4.7l8-5.8c.5-.4.5-1.1 0-1.4l-8-5.8c-.6-.4-1.4 0-1.4.7z" ' + ink + "/>"),
    menu: svg('<rect x="4" y="6" width="16" height="2.6" rx="1.3" ' + ink + '/><rect x="4" y="10.7" width="16" height="2.6" rx="1.3" ' + ink + '/><rect x="4" y="15.4" width="16" height="2.6" rx="1.3" ' + ink + "/>"),
    sun: svg('<g stroke="' + C.goldDeep + '" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g><circle cx="12" cy="12" r="4.6" fill="' + C.gold + '" stroke="' + C.goldDeep + '" stroke-width="1.4"/>'),
    check: svg('<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="' + C.navy + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    close: svg('<path d="M7 7l10 10M17 7L7 17" stroke="' + C.navy + '" stroke-width="2.8" stroke-linecap="round"/>'),
  };
  const CSS = `
.hv-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(0,0,0,0) 62%,rgba(28,24,10,.16) 100%)}
.hv{position:absolute;inset:0;pointer-events:none;font-family:'Kenney Future',system-ui,sans-serif;color:${C.navy};-webkit-font-smoothing:antialiased}
.hv *{box-sizing:border-box}
.hv-panel{pointer-events:auto;background:${C.cream};border:1.5px solid ${C.line};border-radius:12px;box-shadow:0 2px 0 rgba(120,92,48,.22),0 8px 22px rgba(40,30,15,.20)}
.hv-res{position:absolute;left:calc(14px + env(safe-area-inset-left));top:calc(12px + env(safe-area-inset-top));display:flex;align-items:center;gap:4px;padding:5px 12px 5px 8px}
.hv-r{display:flex;align-items:center;gap:5px;padding:0 6px;font-size:17px;line-height:1;white-space:nowrap}
.hv-r img{width:30px;height:30px;display:block}
.hv-r b{font-weight:normal;min-width:24px;display:inline-block;transition:transform .15s}
.hv-r b.bump{transform:scale(1.25);color:${C.goldDeep}}
.hv-r b.low{color:${C.brick}}
.hv-sep{width:1px;align-self:stretch;margin:4px 4px;background:${C.line}}
.hv-goal{position:absolute;left:calc(14px + env(safe-area-inset-left));top:calc(64px + env(safe-area-inset-top));display:flex;align-items:center;gap:10px;padding:8px 14px 8px 10px;background:${C.navy};color:${C.cream};border:1.5px solid #2f3b58;border-radius:11px;font-size:14px;letter-spacing:.2px;box-shadow:0 2px 0 rgba(10,14,30,.35),0 8px 18px rgba(20,20,30,.22);transition:background .3s}
.hv-goal .box{width:20px;height:20px;border-radius:5px;border:2px solid ${C.cream};display:flex;align-items:center;justify-content:center;flex:none}
.hv-goal .box img{width:16px;height:16px;opacity:0}
.hv-goal.done .box{background:${C.gold};border-color:${C.gold}}
.hv-goal.done .box img{opacity:1}
.hv-goal small{display:block;font-size:11px;opacity:.72;margin-top:2px;font-family:system-ui,sans-serif;letter-spacing:0}
.hv-time{position:absolute;right:calc(14px + env(safe-area-inset-right));top:calc(12px + env(safe-area-inset-top));display:flex;align-items:center;gap:4px;padding:4px 6px 4px 10px}
.hv-day{display:flex;align-items:center;gap:6px;font-size:16px;padding-right:6px;white-space:nowrap}
.hv-day img{width:24px;height:24px}
.hv-btn{pointer-events:auto;width:38px;height:34px;border:0;border-radius:9px;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.hv-btn img{width:20px;height:20px;display:block}
.hv-btn:hover{background:${C.cream2}}
.hv-btn.on{background:${C.gold};box-shadow:inset 0 0 0 1.5px ${C.goldDeep}}
.hv-bar{position:absolute;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:8px;padding:8px}
.hv-card{pointer-events:auto;position:relative;width:94px;height:98px;border:1.5px solid ${C.line};border-radius:11px;background:${C.cream};display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:4px 2px 0;cursor:pointer;font:inherit;color:${C.navy};transition:transform .12s,box-shadow .12s}
.hv-card img{width:66px;height:66px;display:block;pointer-events:none}
.hv-card span{font-size:11px;line-height:1.1;margin-top:4px;white-space:nowrap;letter-spacing:-.2px}
.hv-card span.short{display:none}
.hv-card kbd{position:absolute;left:6px;top:4px;font:10px system-ui,sans-serif;opacity:.45}
.hv-card:hover{transform:translateY(-2px)}
.hv-card.on{border-color:${C.gold};box-shadow:0 0 0 3px ${C.gold},0 6px 14px rgba(120,80,20,.25);transform:translateY(-3px)}
.hv-card.poor img{opacity:.45;filter:saturate(.4)}
.hv-card.poor span{opacity:.6}
.hv-tip{position:absolute;left:50%;bottom:calc(132px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;font-size:13px;white-space:nowrap}
.hv-tip .cost{display:flex;gap:8px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600}
.hv-tip .cost i{font-style:normal;display:flex;align-items:center;gap:2px}
.hv-tip .cost img{width:20px;height:20px}
.hv-tip .cost i.short{color:${C.brick}}
.hv-tip .msg{font-family:system-ui,sans-serif;font-size:13px;color:${C.navy2}}
.hv-tip .msg.bad{color:${C.brick};font-weight:600}
.hv-tip .x{width:28px;height:28px}
.hv-tip.hide{display:none}
.hv-float{position:absolute;transform:translate(-50%,-100%);pointer-events:none;font-size:15px;color:${C.navy};background:${C.cream};border:1.5px solid ${C.line};border-radius:9px;padding:3px 8px;white-space:nowrap;box-shadow:0 4px 10px rgba(40,30,15,.2)}
@media (max-width:760px),(max-height:520px){
 .hv-res{padding:3px 8px 3px 5px;gap:0}.hv-r{font-size:13px;padding:0 3px;gap:3px}.hv-r img{width:22px;height:22px}.hv-r b{min-width:16px}
 .hv-goal{top:calc(48px + env(safe-area-inset-top));font-size:12px;padding:6px 10px 6px 8px}.hv-goal small{display:none}
 .hv-time{padding:2px 4px 2px 8px}.hv-day{font-size:13px}.hv-day img{width:18px;height:18px}.hv-btn{width:32px;height:30px}.hv-btn img{width:17px;height:17px}
 .hv-bar{gap:5px;padding:5px;bottom:calc(8px + env(safe-area-inset-bottom))}.hv-card{width:62px;height:70px;border-radius:9px}.hv-card img{width:44px;height:44px}.hv-card span{font-size:9px;letter-spacing:-.4px}.hv-card span.long{display:none}.hv-card span.short{display:block}.hv-card kbd{display:none}
 .hv-tip{bottom:calc(92px + env(safe-area-inset-bottom));font-size:11px;padding:5px 6px 5px 10px}.hv-tip .cost,.hv-tip .msg{font-size:11px}.hv-tip .cost img{width:16px;height:16px}
}
@media (max-height:520px) and (min-width:521px){ .hv-tip{top:calc(50px + env(safe-area-inset-top));bottom:auto} }
@media (max-width:520px){ .hv-res{left:calc(8px + env(safe-area-inset-left));right:calc(8px + env(safe-area-inset-right));justify-content:space-between} .hv-time{top:calc(48px + env(safe-area-inset-top));right:calc(8px + env(safe-area-inset-right))} .hv-goal{left:calc(8px + env(safe-area-inset-left));top:calc(48px + env(safe-area-inset-top));max-width:calc(100vw - 196px)} .hv-day{display:none} .hv-bar{max-width:calc(100vw - 12px);gap:4px;padding:4px} .hv-card{width:56px} .hv-tip{max-width:calc(100vw - 16px)} .hv-tip b{display:none}}
.nk-ui .nk-panel{background:${C.cream};color:${C.navy};border:2px solid ${C.line};box-shadow:0 6px 0 rgba(120,92,48,.25),0 18px 40px rgba(20,15,5,.35)}
.nk-ui .nk-panel h1{color:${C.navy};text-shadow:none}
.nk-ui .nk-panel p,.nk-ui .nk-row{color:${C.navy2}}
.nk-ui .nk-btn{background:${C.navy};box-shadow:0 4px 0 #10172a;color:${C.cream}}
.nk-ui .nk-btn.ok{background:${C.gold};color:${C.navy};box-shadow:0 4px 0 ${C.goldDeep}}
.nk-ui .nk-btn.alt{background:${C.cream2};color:${C.navy};box-shadow:0 4px 0 ${C.line}}
.nk-ui .nk-screen{background:rgba(30,26,18,.35)}
.nk-ui .nk-row input[type=range]{accent-color:${C.navy}}
.nk-ui .nk-btn:focus{outline:none}.nk-ui .nk-btn:focus-visible{outline:2.5px solid ${C.navy};outline-offset:2px}
.nk-ui .nk-toast{background:${C.navy};color:${C.cream};font-family:'Kenney Future',system-ui,sans-serif;bottom:calc(150px + env(safe-area-inset-bottom))}
`;

  /** The game's UI theme (HUD + the kit's menu/pause/settings panels in cream, navy and gold). Idempotent. */
  function theme() { const ui = NK.ui.root(); if (!ui.querySelector("#hv-css")) ui.appendChild(NK.ui.h("style", { id: "hv-css", text: CSS })); }
  NK.def("hudTheme", theme);
  NK.def("Hud", function (scene, icons, handlers) {
    const ui = NK.ui.root(), h = NK.ui.h;
    theme();
    const root = h("div", { class: "hv", "data-hv": "1" });
    root.appendChild(h("div", { class: "hv-vignette" })); // soft edge darkening that frames the village (no blur)
    ui.appendChild(root);
    scene.onDispose(() => root.remove());
    const img = (src, alt) => h("img", { src, alt: alt || "", draggable: "false" });

    // resources
    const RES = [["wood", "Wood"], ["stone", "Stone"], ["food", "Food"], ["gold", "Gold"]];
    const vals = {};
    const res = h("div", { class: "hv-panel hv-res", "data-help": "Your village's stores" });
    RES.forEach(([k, name], i) => {
      const b = h("b", { text: "0" });
      vals[k] = b;
      res.appendChild(h("div", { class: "hv-r", title: name }, [img(icons[k], name), b]));
    });
    res.appendChild(h("div", { class: "hv-sep" }));
    const pop = h("b", { text: "0" });
    vals.pop = pop;
    res.appendChild(h("div", { class: "hv-r pop", title: "Villagers / homes" }, [img(icons.pop, "Villagers"), pop]));
    root.appendChild(res);

    // goal
    const goalText = h("div", {}), goalSub = h("small", {});
    const goal = h("div", { class: "hv-goal" }, [h("div", { class: "box" }, [img(GLYPH.check)]), h("div", {}, [goalText, goalSub])]);
    root.appendChild(goal);

    // time
    const dayTxt = h("span", { text: "Day 1" });
    const speeds = {};
    const time = h("div", { class: "hv-panel hv-time" }, [h("div", { class: "hv-day" }, [img(GLYPH.sun), dayTxt])]);
    [["0", "pause", "Pause time"], ["1", "play", "Normal speed"], ["3", "fast", "Fast"]].forEach(([v, g, t]) => {
      const b = h("button", { class: "hv-btn", title: t, "aria-label": t, onclick: () => handlers.speed(Number(v)) }, [img(GLYPH[g])]);
      speeds[v] = b;
      time.appendChild(b);
    });
    time.appendChild(h("div", { class: "hv-sep" }));
    time.appendChild(h("button", { class: "hv-btn", title: "Menu", "aria-label": "Menu", onclick: () => NK.pause() }, [img(GLYPH.menu)]));
    root.appendChild(time);

    // toolbar
    const BLD = NK.use("buildings");
    const cards = {};
    const bar = h("div", { class: "hv-bar" });
    BLD.ORDER.forEach((t, i) => {
      const T = BLD.TYPES[t];
      const c = h("button", { class: "hv-card", title: T.label + " (" + (i + 1) + ")", "aria-label": T.label, onclick: () => handlers.tool(t) }, [h("kbd", { text: String(i + 1) }), img(icons["b-" + t], T.label), h("span", { class: "long", text: T.label }), h("span", { class: "short", text: T.short || T.label })]);
      cards[t] = c;
      bar.appendChild(c);
    });
    root.appendChild(bar);

    // tip above the toolbar: cost + what the preview says
    const cost = h("div", { class: "cost" }), msg = h("div", { class: "msg" });
    const tip = h("div", { class: "hv-panel hv-tip hide" }, [h("b", { text: "" }), cost, msg, h("button", { class: "hv-btn x", title: "Cancel", "aria-label": "Cancel", onclick: () => handlers.tool(null) }, [img(GLYPH.close)])]);
    root.appendChild(tip);

    const shown = {};
    const api = {
      root,
      set(run) {
        for (const k of ["wood", "stone", "food", "gold"]) {
          const v = Math.floor(run[k]);
          if (shown[k] !== undefined && v > shown[k]) { vals[k].classList.remove("bump"); void vals[k].offsetWidth; vals[k].classList.add("bump"); api._bumpT = 0.25; }
          shown[k] = v;
          vals[k].textContent = String(v);
        }
        pop.textContent = Math.floor(run.pop) + "/" + run.cap;
        dayTxt.textContent = "Day " + run.day;
      },
      update(dt) { if (api._bumpT > 0) { api._bumpT -= dt; if (api._bumpT <= 0) root.querySelectorAll(".bump").forEach((e) => e.classList.remove("bump")); } },
      speed(v) { Object.keys(speeds).forEach((k) => speeds[k].classList.toggle("on", Number(k) === v)); },
      goal(text, sub, done) { goalText.textContent = text; goalSub.textContent = sub || ""; goal.classList.toggle("done", !!done); },
      tool(t, run) {
        Object.keys(cards).forEach((k) => cards[k].classList.toggle("on", k === t));
        tip.classList.toggle("hide", !t);
        if (!t) return;
        const T = BLD.TYPES[t];
        tip.firstChild.textContent = T.label;
        api.cost(t, run);
      },
      cost(t, run) {
        const T = BLD.TYPES[t];
        cost.innerHTML = "";
        for (const k of Object.keys(T.cost)) cost.appendChild(h("i", { class: run[k] < T.cost[k] ? "short" : "" }, [img(icons[k]), String(T.cost[k])]));
      },
      afford(run) {
        for (const t of BLD.ORDER) { const T = BLD.TYPES[t]; cards[t].classList.toggle("poor", Object.keys(T.cost).some((k) => run[k] < T.cost[k])); }
      },
      message(text, bad) { msg.textContent = text || ""; msg.classList.toggle("bad", !!bad); },
    };
    return api;
  });
})();
