// Building factory: every structure is a small arrangement of library pieces at the shared scale
// (KayKit x3.4 family, Kenney by target height). Used by the static colony, the build ghost and the toolbar icons.
(function () {
  const piece = (...a) => NK.use("piece")(...a);
  const group = (name, ...kids) => { const g = new THREE.Group(); g.name = name; kids.forEach((k) => g.add(k)); return g; };
  const lift = (o, y) => { o.position.y += y; return o; };
  /** Top of an object's bounds (after scaling), for stacking pieces. */
  const top = (o) => new THREE.Box3().setFromObject(o).max.y;

  const MAKERS = {
    // --- placeable (toolbar)
    habitat: () => {
      const m = piece("module-b", { scale: 3.0 });
      const roof = piece("dome", { scale: 1.9 }); roof.position.y = top(m) - 0.1;
      return group("habitat", m, roof);
    },
    solar: () => group("solar", piece("roof-solar", { scale: 3.3 })),
    oxygen: (stack) => {
      // No O2 tank in the packs: the KayKit water tank, atlas-swapped to white, stacked twice on a plinth.
      const base = piece("roof-base", { scale: 2.3 });
      const a = piece("water-tank", { scale: 1.45, variant: "white" }); a.position.y = top(base) - 0.02;
      const g = group("oxygen", base, a);
      let last = a;
      for (let i = 1; i < (stack || 2); i++) { const b = piece("water-tank", { scale: 1.45, variant: "white" }); b.position.y = top(last) - 0.06; b.rotation.y = i * Math.PI; g.add(b); last = b; }
      return g;
    },
    storage: () => group("storage", piece("depot", { scale: 2.6, variant: "supply" })),
    defense: () => group("defense", piece("turret", { height: 3.4 })),
    // --- static set pieces
    hub: (s, v) => group("hub", piece("hub", { scale: s || 3.9, variant: v })),
    greenhouse: () => {
      const base = piece("module-b", { scale: 3.4, scaleXYZ: [1, 0.32, 1] });
      const farm = piece("farm", { scale: 3.1 }); farm.position.y = top(base) - 0.05;
      const dome = piece("dome", { scale: 3.45 }); dome.position.y = top(base) - 0.08;
      return group("greenhouse", base, farm, dome);
    },
    tank: () => MAKERS.oxygen(3),
    solarArray: () => MAKERS.solar(),
    rover: () => {
      const frame = piece("rover-frame", { scale: 1.75 });
      const cab = piece("mod-command", { scale: 1.75 }); cab.position.y = top(frame) - 0.12;
      return group("rover", frame, cab);
    },
  };
  NK.def("makeBuilding", (id, ...args) => {
    const make = MAKERS[id];
    if (!make) throw new Error("No building " + id);
    const g = make(...args);
    g.userData.kind = id;
    return g;
  });
  NK.def("stackTop", top);
})();
