// Hearthvale: renderer look (warm afternoon, matte, no fog), run state, menu.
// The camera is the game's own orthographic rig (src/entities/camera.js), so there is no player and no kit camera rig.
NK.config({
  physics: false,               // no physics needed: placement picks hexes from the ground plane
  background: 0xa9d3ea,         // pale sky, only seen past the world edge at the widest zoom
  toneMapping: "neutral",       // keeps the palette's hues (ACES shifts greens and oranges)
  exposure: 0.97,
  ambient: 0.9,                // hemisphere fill: keeps shaded sides readable
  skyColor: 0xe4eeff,
  groundColor: 0x7d6c4a,
  sun: 2.25,
  sunColor: 0xffd9a6,           // warm afternoon sun
  sunDirection: [-0.66, 0.6, 0.45], // afternoon sun from the south-west, ~37° up: longer shadows fall north-east, away from the paths
  environmentIntensity: 0.22,   // a little image-based fill, not enough to make anything shiny
  shadowRange: 18,              // replaced every frame by the rig, which fits the shadow box to the view
  run: { wood: 60, stone: 30, food: 40, gold: 50, day: 1 },
  orientation: "landscape",
  // Tap/drag/pinch are handled by the game's camera rig and toolbar; no stick or buttons on screen.
  touch: { stick: false, buttons: [] },
  menu: { subtitle: "A small village by the river. Choose a building, find it a spot, and help Hearthvale grow.", play: "Play", music: "music" },
});
