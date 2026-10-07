// Enemies: slimes patrol and turn at walls and ledges (spiky ones can't be stomped); bees fly loops.
NK.def("Slime", class Slime extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind = "normal") {
    super(scene, x, y, "enemies", kind === "spike" ? "slime_spike_walk_a" : "slime_normal_walk_a");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.alive = true;
    this.stompable = kind !== "spike";
    this.dir = -1;
    this.speed = kind === "spike" ? 70 : 95;
    this.setDepth(8);
    this.body.setSize(52, 34).setOffset(6, 30);
    this.play(kind === "spike" ? "spike-walk" : "slime-walk");
  }

  fixedUpdate() {
    if (!this.alive) return;
    const b = this.body;
    if (b.blocked.left) this.dir = 1;
    else if (b.blocked.right) this.dir = -1;
    else if (b.blocked.down) {
      const ground = this.scene.lvl.layers.ground;
      const ahead = ground && ground.getTileAtWorldXY(this.x + this.dir * 34, this.y + 44);
      if (!ahead) this.dir *= -1;
    }
    this.setVelocityX(this.dir * this.speed);
    this.setFlipX(this.dir > 0);
  }

  squash() {
    this.alive = false;
    this.body.enable = false;
    this.anims.stop();
    this.setFrame(this.kind === "spike" ? "slime_spike_flat" : "slime_normal_flat");
    this.scene.tweens.add({ targets: this, alpha: 0, delay: 400, duration: 300, onComplete: () => this.destroy() });
  }
});

NK.def("Bee", class Bee extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "enemies", "bee_a");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.alive = true;
    this.stompable = true;
    this.body.setAllowGravity(false);
    this.body.setSize(44, 36).setOffset(10, 16);
    this.setDepth(8);
    this.t = NK.rng.float(0, 6);
    this.play("bee-fly");
  }

  fixedUpdate(dt) {
    if (!this.alive) return;
    this.t += dt;
    this.setVelocity(Math.cos(this.t * 0.9) * 150, Math.cos(this.t * 3) * 60);
    this.setFlipX(Math.cos(this.t * 0.9) > 0);
  }

  squash() {
    this.alive = false;
    this.body.enable = false;
    this.anims.stop();
    this.setFrame("bee_rest").setFlipY(true);
    this.scene.tweens.add({ targets: this, y: this.y + 300, alpha: 0, duration: 700, onComplete: () => this.destroy() });
  }
});
