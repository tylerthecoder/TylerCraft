class EntityCamera {
  entity: Entity;

  offset: IDim = [0, 3, 0];

  constructor(ent: Entity) {
    this.entity = ent;
  }
}
