// Coins: spinning, collected with a sparkle.
NK.def("Coin", class Coin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, id) {
    super(scene, x, y, "tiles", "coin_gold");
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.id = id;
    this.body.setCircle(20, 12, 12);
    this.setDepth(6);
    this.play({ key: "coin-spin", startFrame: NK.rng.int(0, 1) });
  }

  collect(sparks) {
    this.body.enable = false;
    sparks.explode(8, this.x, this.y);
    this.scene.tweens.add({ targets: this, y: this.y - 50, alpha: 0, scale: 1.4, duration: 250, onComplete: () => this.destroy() });
  }
});
