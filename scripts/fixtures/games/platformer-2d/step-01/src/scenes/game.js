// Step 1 — an empty play scene so the menu → play → pause → game over loop works from the start.
NK.scene("Game", class extends NK2D.Scene {
  create() {
    NK2D.text(this, this.W / 2, this.H / 2, "Level " + NK.run.level, { size: 56 });
    NK2D.hud(this).label("hint", "Press Esc to pause");
  }
});
