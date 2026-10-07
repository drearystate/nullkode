// Game shell: renderer look, camera lens, run state and controls.
// Look: warm low sun from the upper left, lavender sky fill + terracotta bounce, ACES tone mapping,
// ground-coloured distance fog so the plain never ends on screen. No physics: a builder needs none.
NK.config({
  physics: false,
  background: 0xc98a6e,          // dust haze (only visible through fog at the far edge)
  fog: [95, 190],
  toneMapping: "aces",
  exposure: 1.12,
  ambient: 0.62,                 // hemisphere fill strength (low: cast shadows stay readable)
  skyColor: 0xd9d4f0,            // lavender sky → cool, purple-brown shadow sides (as in the reference)
  groundColor: 0xb0624a,         // terracotta bounce
  sun: 3.9,
  sunColor: 0xffe2c4,
  sunDirection: [-0.85, 1.0, -0.28], // from the upper left of the screen (camera yaw 28 deg): shadows fall right-down
  environmentIntensity: 0.25,
  shadowRange: 34,
  fov: 26,                       // long lens: near-isometric, mild perspective
  far: 400,
  pauseOnBlur: true,
  orientation: "landscape",
  // Base-builder controls are taps on the world and the toolbar (see src/world/camera-rig.js), so no stick.
  touch: { stick: false, buttons: [] },
  // run state (NK.resetRun copies this shallowly, so arrays/objects such as built/done are created in the scene)
  run: { crystals: 124, water: 86, energy: 62, sol: 7, solT: 0, objective: 0, score: 0 },
  menu: { subtitle: "Build the first colony on Mars: power, water, crystals, air.", music: "music", play: "Start mission" },
});
