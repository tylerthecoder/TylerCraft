class Cube extends Entity {
  falling = false;

  constructor(pos: IDim, dim?: IDim) {
    super();
    this.pos = pos;
    this.dim = dim || [1, 1, 1];
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

  render(camera: Camera) {}
}
