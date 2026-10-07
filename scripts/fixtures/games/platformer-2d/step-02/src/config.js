// Game shell: size, physics, the run state every new game starts with, menu look + music.
NK.config({
  width: 1280,
  height: 720,
  background: "#c3e3ff",
  physics: "arcade",
  gravity: 1800,
  orientation: "landscape",
  run: { score: 0, coins: 0, lives: 3, level: 1 },
  menu: {
    subtitle: "Collect coins. Stomp slimes. Reach the flag.",
    music: "music",
    background: "#c3e3ff",
    parallax: [
      { texture: "bg", frame: "background_clouds", y: -300, height: 512, factor: 0.1, scale: 2 },
      { texture: "bg", frame: "background_color_hills", y: 208, height: 512, factor: 0.2, scale: 2 },
    ],
  },
});
