class Player extends Entity {
  uid: string;

  thirdPerson = true;

  onGround = false;

  jumpCount = 0;

  form: CubeForm;

  constructor() {
    super([0, 11, 0], [0, 0, 0], [1, 2, 1], [Math.PI / 2, 0, 0]);
  }

  build(canvas: CanvasProgram) {
    const textureCords = [
      [0, 1, 0, 0, 1, 0, 1, 1], // front
      [0, 1, 0, 0, 1, 0, 1, 1], // back
      [0, 0, 1, 0, 1, 1, 0, 1], // top
      [0, 0, 1, 0, 1, 1, 0, 1], // bottom
      [1, 1, 0, 1, 0, 0, 1, 0], // right
      [1, 1, 0, 1, 0, 0, 1, 0] // left
    ];

    const texture = canvas.textures.player;
    this.form = new CubeForm(canvas, texture, textureCords, [1, 2, 1]);
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
