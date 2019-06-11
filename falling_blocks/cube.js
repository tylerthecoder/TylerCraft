class Cube {
  size = 1;
  rot = 0;

  dim = [1, 1, 1];

  constructor(gl, program, texture, pos) {
    this.pos = pos;
    this.form = new CubeForm(texture, program, gl);
  }

  update(delta) {
    // this.size = Math.sin(this.size + .0003 * delta);
    // this.rot += .01 * delta;
  }


  render(screenPos, screenRot) {
    this.form.render(this.size, this.pos, this.rot, screenPos, screenRot);
  }

  isCollide(player) {
    let dirSet = new Set()
    for (let i = 0; i < 3; i++) {
      if (Math.abs(this.pos[i] - player.pos[i]) < this.dim[i] / 2 + player.dim[i]) {
        dirSet.add(i)
      }
    }

    if (dirSet.size === 3) {
      return 1;
    }

    return -1;
  }
}