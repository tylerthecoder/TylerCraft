class Player extends Entity {
  uid: string;

  thirdPerson = true;

  onGround = false;

  jumpCount = 0;

  form: any;

  constructor(canvas?: CanvasProgram) {
    super([0, 5, 0], [0, 0, 0], [1, 2, 1], [Math.PI / 2, 0, 0]);

    if (canvas) this.build(canvas);
  }

  build(canvas: CanvasProgram) {
    const textures = [
      canvas.textures.player,
      canvas.textures.player,
      canvas.textures.player,
      canvas.textures.player,
      canvas.textures.player,
      canvas.textures.player
    ];
    this.form = new CubeForm(canvas, textures, [1, 2, 1]);
  }

  rotate(r: number[]) {
    for (let i = 0; i < r.length; i++) {
      this.rot[i] += r[i];
    }
    if (this.rot[0] < 0) this.rot[0] = 0;
    if (this.rot[0] > Math.PI) this.rot[0] = Math.PI;
  }

  update() {
    this.onGround = false;
    this.gravity();
    this.move(this.vel);
  }

  render(camPos: IDim, camRot: IDim) {
    this.form.render(this.pos, camPos, camRot);
  }

  jump() {
    if (this.jumpCount < 5) {
      this.vel[1] = 0.1;
      this.jumpCount++;
    }
  }
}
