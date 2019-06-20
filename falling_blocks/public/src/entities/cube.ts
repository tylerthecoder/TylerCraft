class Cube extends Entity {
  form: CubeForm;
  falling = false;

  constructor(canvas: CanvasProgram, pos: IDim, dim: IDim = [1, 1, 1]) {
    super(pos, [0, 0, 0], dim);

    const textureCords = [
      [0.66, 1, 0.66, 0, 1, 0, 1, 1], // front
      [0.66, 1, 0.66, 0, 1, 0, 1, 1], // back
      [0.33, 0, 0.33, 1, 0.66, 1, 0.66, 0], // top
      [0, 0, 0, 1, 0.33, 1, 0.33, 0], // bottom
      [1, 1, 0.66, 1, 0.66, 0, 1, 0], // right
      [1, 1, 0.66, 1, 0.66, 0, 1, 0] // left
    ];

    const texture = canvas.textures.grassBlock;

    this.form = new CubeForm(canvas, texture, textureCords, dim);
  }

  update(_delta: number) {
    // if (Math.random() < 0.001) {
    //   this.falling = true;
    // }

    if (this.falling) {
      this.gravity();
    }
    this.move(this.vel);
  }

  render(camPos: number[], camRot: number[]) {
    this.form.render(this.pos, camPos, camRot);
  }
}
