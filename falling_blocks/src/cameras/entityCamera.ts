class EntityCamera extends Camera {
  entity: Entity;

  offset: IDim = [0, 1.5, 0];

  constructor(ent: Entity) {
    super();
    this.entity = ent;
  }

  get pos(): IDim {
    this.offset[0] = -Math.sin(this.entity.rot[1]) * 3;
    this.offset[1] = Math.cos(this.entity.rot[0]) * 3;
    this.offset[2] = Math.cos(this.entity.rot[1]) * 3;

    return this.entity.pos.map((x, i) => x + this.offset[i]).slice(0) as IDim;
  }

  get rot() {
    const rot = [this.entity.rot[0], this.entity.rot[1], this.entity.rot[2]];
    return rot as IDim;
  }
}
