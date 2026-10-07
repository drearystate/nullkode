// Game shell: renderer look (dark crypt, fog, moonlight shadows), physics, camera, run state, controls.
NK.config({
  physics: true,
  gravity: -25,
  background: 0x161a26,
  fog: [22, 55],
  toneMapping: "aces",
  exposure: 1.15,
  ambient: 0.9,
  skyColor: 0x8c9cc8,
  groundColor: 0x3a2a20,
  sun: 1.6,
  sunColor: 0xb8c8ff,
  sunDirection: [0.45, 1, 0.3],
  environmentIntensity: 0.35,
  shadowRange: 24,
  camera: { mode: "third-person", distance: 8, lookAtHeight: 2, pitch: 0.5 },
  run: { score: 0, coins: 0, health: 5 },
  orientation: "landscape",
  touch: {
    stick: "left",
    look: true,
    buttons: [
      { action: "jump", icon: "kenney/mobile-controls/icon-jump" },
      { action: "action", icon: "kenney/mobile-controls/icon-sword" },
    ],
  },
  menu: { subtitle: "Grab every coin, open the chest, and keep away from the skeleton.", music: "music" },
});
