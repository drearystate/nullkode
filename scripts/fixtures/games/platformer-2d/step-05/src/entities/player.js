// The hero: run, variable-height jump with coyote time + jump buffer, hurt knock-back + blinking.
NK.def("Player", class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "chars", "character_green_idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.75).setDepth(10);
    this.body.setSize(56, 84).setOffset(36, 44);
    this.body.setMaxVelocity(600, 1300);
    this.coyote = 0;
    this.buffer = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.frozen = false;
  }

  fixedUpdate(dt) {
    const body = this.body;
    const onGround = body.blocked.down || body.touching.down;
    this.coyote = onGround ? 0.1 : Math.max(0, this.coyote - dt);
    this.buffer = NK.input.pressed("jump") ? 0.12 : Math.max(0, this.buffer - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    const move = this.frozen || this.hurtT > 0 ? 0 : NK.input.axis("moveX");
    body.setVelocityX(Phaser.Math.Linear(body.velocity.x, move * 430, onGround ? 0.3 : 0.12));
    if (!this.frozen && this.buffer > 0 && this.coyote > 0) {
      body.setVelocityY(-1000);
      this.buffer = this.coyote = 0;
      NK.audio.play("jump", { volume: 0.6 });
    }
    // Let go early for a short hop.
    if (!NK.input.down("jump") && body.velocity.y < -350) body.setVelocityY(body.velocity.y * 0.82);
    if (move) this.setFlipX(move < 0);

    if (this.invuln > 0) { this.invuln -= dt; this.setAlpha(Math.floor(this.invuln * 14) % 2 ? 0.35 : 1); }
    else this.setAlpha(1);
    const anim = this.hurtT > 0 ? "hero-hit" : !onGround ? "hero-jump" : Math.abs(body.velocity.x) > 40 ? "hero-walk" : "hero-idle";
    this.play(anim, true);
  }

  bounce(power = 700) { this.body.setVelocityY(-power); }

  /** Knock-back away from x; returns false while still blinking from the last hit. */
  hurt(fromX) {
    if (this.invuln > 0) return false;
    this.invuln = 1.6;
    this.hurtT = 0.35;
    this.body.setVelocity(this.x < fromX ? -380 : 380, -560);
    return true;
  }
});
