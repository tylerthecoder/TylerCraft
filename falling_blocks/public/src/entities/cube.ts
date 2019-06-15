class Cube extends Entity {
  form: CubeForm;
  falling = false;

  constructor(canvas: CanvasProgram, pos: IDim, dim: IDim = [1, 1, 1]) {
    super(pos, [0, 0, 0], dim);

    const textures: any[] = [
      canvas.textures.dirtGrass,
      canvas.textures.dirtGrass,
      canvas.textures.grass,
      canvas.textures.dirt,
      canvas.textures.dirtGrass,
      canvas.textures.dirtGrass
    ];

    this.form = new CubeForm(canvas, textures, dim);
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

  render(camPos: number[], camRot: number[]) {
    this.form.render(this.pos, camPos, camRot);
  }
}
