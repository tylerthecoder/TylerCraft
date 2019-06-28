abstract class Entity {
  pos: IDim = [0, 0, 0];
  vel: IDim = [0, 0, 0];
  dim: IDim = [1, 1, 1];
  rot: IDim = [0, 0, 0];

  onGround = false;
  jumpCount = 0;

  uid = "";

  constructor() {}

  abstract update(delta: number): void;
  abstract render(camera: Camera): void;

  move(p: IDim) {
    for (let i = 0; i < p.length; i++) {
      this.pos[i] += p[i];
    }
  }

  applyForce(f: IDim) {
    for (let i = 0; i < f.length; i++) {
      this.vel[i] += f[i];
    }
  }

  rotate(r: number[]) {
    for (let i = 0; i < r.length; i++) {
      this.rot[i] += r[i];
    }
    if (this.rot[0] < 0) this.rot[0] = 0;
    if (this.rot[0] > Math.PI) this.rot[0] = Math.PI;
  }

  gravity() {
    this.applyForce([0, -0.007, 0]);
  }

  isCollide(ent: Entity) {
    for (let i = 0; i < 3; i++) {
      if (
        !(Math.abs(this.pos[i] - ent.pos[i]) < this.dim[i] / 2 + ent.dim[i] / 2)
      ) {
        return false;
      }
    }
    return true;
  }

  pushOut(ent: Entity) {
    let min = [Infinity];

    for (let i = 0; i < 3; i++) {
      for (let dir = -1; dir <= 1; dir += 2) {
        // calculate the distance from a face on the player to a face on the ent
        const p = this.pos[i] + (this.dim[i] / 2) * dir;
        const c = ent.pos[i] + (ent.dim[i] / 2) * -1 * dir;
        const dist = c - p;
        // find the shortest distance (that is best one to move)
        if (Math.abs(dist) < Math.abs(min[0])) {
          min = [dist, i, dir];
        }
      }
    }

    const [_, i, dir] = min;

    this.pos[i] = ent.pos[i] + (ent.dim[i] / 2 + this.dim[i] / 2) * -dir;

    this.vel[i] = 0;

    if (i == 1 && dir == -1) {
      this.onGround = true;
      this.jumpCount = 0;
    }
  }
}
