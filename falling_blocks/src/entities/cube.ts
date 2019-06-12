class Cube extends Entity {
  rot = 0;

  form: CubeForm;

  falling = false;

  constructor(canvas: any, pos: number[], dim = [1, 1, 1]) {
    super(pos, [0, 0, 0], dim);

    this.form = new CubeForm(canvas, canvas.cubeTexture);
  }

  update(_delta: number) {
    if (this.falling) {
      this.gravity();
    }
    for (let i = 0; i < 3; i++) {
      this.pos[i] += this.vel[i];
    }
  }

  gravity() {
    this.vel[1] -= 0.007;
  }

  render(screenPos: number[], screenRot: number[]) {
    this.form.render(this.dim, this.pos, this.rot, screenPos, screenRot);
  }
}
