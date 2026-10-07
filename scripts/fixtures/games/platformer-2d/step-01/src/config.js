// Step 1 — game shell: size, physics, the run state every new game starts with.
NK.config({
  width: 1280,
  height: 720,
  background: "#8fd3ff",
  physics: "arcade",
  gravity: 1800,
  orientation: "landscape",
  run: { score: 0, coins: 0, lives: 3, level: 1 },
  menu: { subtitle: "Collect coins. Stomp slimes. Reach the flag." },
});
