// Game shell: renderer look (dark slate crypt, warm torches against cool shadows), physics, run state, controls.
// The camera is the game's own isometric rig (src/entities/camera.js); `camera` below holds its settings.
NK.config({
  physics: true,
  gravity: -25,
  background: 0x0b0e16,
  fog: [36, 70],
  toneMapping: "neutral",
  exposure: 1.05,
  // Cool ambient fill: blue-grey from above, dark plum from below (the shadows read cool).
  ambient: 0.95,
  skyColor: 0x6a78b8,
  groundColor: 0x1a1622,
  // One shadow-casting key light: weak, warm-neutral, high over the vault (north-west), so contact shadows fall toward the camera.
  sun: 0.45,
  sunColor: 0xffd9b0,
  sunDirection: [-0.45, 1, -0.6],
  environmentIntensity: 0.18,
  shadowRange: 20,
  fov: 28,
  far: 160,
  camera: { yaw: Math.PI / 4, pitch: 0.66, distance: 29, height: 0.9, lead: [0.7, 0, 1.6], follow: 3.2 },
  run: { health: 6, maxHealth: 6, potions: 2, kills: 0, score: 0, floor: 3, vault: "sealed" },
  orientation: "landscape",
  touch: {
    stick: "left",
    look: false,
    buttons: [
      { action: "attack", icon: "kenney/board-game-icons/double/sword" },
      { action: "bolt", icon: "kenney/board-game-icons/double/exploding" },
      { action: "block", icon: "kenney/board-game-icons/double/shield" },
    ],
  },
  menu: { subtitle: "Floor 03. Cross the flooded hall, break the skeleton guard and open the vault.", music: "music", play: "Enter the hall" },
});

// Abilities 1-4 (the ability bar), plus classic keys and pad buttons. No jumping in this game.
NK.input.unbind("jump");
NK.input.bind({
  attack: ["Digit1", "Numpad1", "KeyJ", "Space", "mouse:0", "pad:2", "touch:attack"],
  bolt: ["Digit2", "Numpad2", "KeyK", "pad:3", "touch:bolt"],
  block: ["Digit3", "Numpad3", "KeyL", "pad:4", "pad:6", "touch:block"],
  potion: ["Digit4", "Numpad4", "KeyH", "KeyQ", "pad:5", "touch:potion"],
});
