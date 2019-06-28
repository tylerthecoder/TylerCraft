class Player extends Entity {
  pos: IDim = [-2, 5, -2];
  dim: IDim = [1, 2, 1];
  rot: IDim = [Math.PI / 2, 0, 0];

  uid: string;

  thirdPerson = true;

  onGround = false;

  canFire = true;

  jumpCount = 0;

  renderer = new Renderer();

  constructor() {
    super();

    this.renderer.setActiveTexture(canvas.textures.player);

    this.setBuffers();
  }

  update() {
    this.onGround = false;
    this.gravity();
    this.move(this.vel);
  }

  render(camera: Camera) {
    this.renderer.render(this.pos, camera);
  }

  jump() {
    if (this.jumpCount < 5) {
      this.vel[1] = 0.1;
      this.jumpCount++;
    }
  }

  fireball() {
    if (this.canFire) {
      const pos = [this.pos[0], this.pos[1] + 4, this.pos[2]] as IDim;
      const ball = new Ball(pos, [0, 0.02, 0]);
      game.addEntity(ball);
      this.canFire = false;
    }
  }

  getFace(i: number, dir: number, size: number[]) {
    const square = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    const pos = square
      .map(edge => {
        edge.splice(i, 0, dir);
        return edge.map((dim, i) => dim * size[i]);
      })
      .flat();
    return pos;
  }

  setBuffers() {
    const base = [0, 1, 2, 0, 2, 3];
    const facesToRender = [0, 1, 2, 3, 4, 5];
    const textureCords = [
      [0, 1, 0, 0, 1, 0, 1, 1], // front
      [0, 1, 0, 0, 1, 0, 1, 1], // back
      [0, 0, 1, 0, 1, 1, 0, 1], // top
      [0, 0, 1, 0, 1, 1, 0, 1], // bottom
      [1, 1, 0, 1, 0, 0, 1, 0], // right
      [1, 1, 0, 1, 0, 0, 1, 0] // left
    ].flat();

    const positions = [];
    const indices = [];
    let count = 0;
    for (const face of facesToRender) {
      const i = face >> 1;
      const dir = face % 2 === 0 ? 0.5 : -0.5;

      const pos = this.getFace(i, dir, this.dim);
      const index = base.map(x => x + count);
      count += 4;

      positions.push(...pos);
      indices.push(...index);
    }

    this.renderer.setBuffers(positions, indices, textureCords);
  }
}
