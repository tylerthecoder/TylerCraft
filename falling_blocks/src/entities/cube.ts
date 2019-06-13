class Cube extends Entity {
  rot = 0;
  form: CubeForm;
  falling = false;

  constructor(canvas: any, pos: number[], dim: IDim = [1, 1, 1]) {
    super(pos, [0, 0, 0], dim);

    this.form = new CubeForm(canvas, canvas.cubeTexture, dim);
  }

  update(_delta: number) {
    // if (Math.random() < 0.001) {
    //   this.falling = true;
    // }

    if (this.falling) {
      this.gravity();
    }
    for (let i = 0; i < 3; i++) {
      this.pos[i] += this.vel[i];
    }
  }

  render(screenPos: number[], screenRot: number[]) {
    this.form.render(this.dim, this.pos, this.rot, screenPos, screenRot);
  }
}
