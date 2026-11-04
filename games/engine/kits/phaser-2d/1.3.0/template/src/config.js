// Game shell. The studio fills this in at step 1.
NK.config({
  width: 1280,
  height: 720,
  background: "#c3e3ff",
  physics: "arcade",
  gravity: 1800,
  orientation: "landscape",
  run: { score: 0, lives: 3, level: 1 },
  menu: { subtitle: "" },
});
