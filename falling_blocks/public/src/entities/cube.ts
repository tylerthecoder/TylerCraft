class Cube extends Entity {
  falling = false;

  constructor(pos: IDim, dim: IDim = [1, 1, 1]) {
    super(pos, [0, 0, 0], dim);
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
}
