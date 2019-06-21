class Cube extends Entity {
  form: CubeForm | ChunkForm;
  falling = false;

  constructor(canvas: CanvasProgram, pos: IDim, dim: IDim = [1, 1, 1]) {
    super(pos, [0, 0, 0], dim);

    const textureCords = [
      [0.5, 0.5, 0.5, 0, 0, 0, 0, 0.5], // front
      [0.5, 0.5, 0.5, 0, 0, 0, 0, 0.5], // back
      [0.5, 0, 0.5, 0.5, 1, 0.5, 1, 0], // top
      [0.5, 1, 0.5, 0.5, 0, 0.5, 0, 1], // bottom
      [0.5, 1, 1, 1, 1, 0.5, 0.5, 0.5], // right
      [0, 0.5, 0.5, 0.5, 0.5, 0, 0, 0] // left
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
