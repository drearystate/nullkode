// Game shell. The studio fills this in at step 1.
NK.config({
  physics: true,
  gravity: -25,
  background: 0x87b5e0,
  camera: { mode: "third-person", distance: 7, pitch: 0.45 },
  run: { score: 0, health: 3 },
  orientation: "landscape",
  menu: { subtitle: "" },
});
