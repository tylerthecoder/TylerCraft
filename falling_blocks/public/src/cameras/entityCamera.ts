class EntityCamera extends Camera {
  entity: Entity;

  offset: IDim = [0, 1, 0];

  constructor(ent: Entity) {
    super();
    this.entity = ent;
  }

  handleMouse(e: MouseEvent) {
    const speed = 0.002;
    const dx = e.movementX * speed;
    const dy = e.movementY * speed;
    this.entity.rotate([-dy, dx, 0]);
    this.rotate([-dy, dx, 0]);
  }

  get pos(): IDim {
    let offset: number[] = [];
    if ((this.entity as Player).thirdPerson) {
      offset = [
        -Math.sin(this.entity.rot[1]) * 7,
        Math.cos(this.entity.rot[0]) * 7,
        Math.cos(this.entity.rot[1]) * 7
      ];
    } else {
      offset = this.offset;
    }

    return this.entity.pos.map((x, i) => x + offset[i]).slice(0) as IDim;
  }

  set pos(_pos: IDim) {}

  get rot() {
    const rot = [this.entity.rot[0], this.entity.rot[1], this.entity.rot[2]];
    return rot as IDim;
  }

  set rot(_pos: IDim) {}
}
