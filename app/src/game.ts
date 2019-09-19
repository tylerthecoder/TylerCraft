import { Player } from "./entities/player";
import { World } from "./world/world";
import { Entity } from "./entities/entity";

export class Game {
  private entities: Entity[] = [];
  entityListeners: Array<(e: Entity) => void> = [];

  world = new World();

  get players() {
    return this.entities.filter(ent => ent instanceof Player);
  }

  update(delta: number) {
    for (const entity of this.entities) {
      entity.update(delta);
    }

    // move the entities out of the blocks
    for (const entity of this.entities) {
      const collisions = this.world.isCollide(entity);
      for (const e of collisions) {
        entity.pushOut(e);
      }

      for (const e of this.entities) {
        if (e === entity) continue;
        e.isCollide(entity);
      }
    }
  }

  addPlayer(realness: boolean, uid?: string): Player {
    const newPlayer = new Player(this, realness);
    if (uid) newPlayer.setUid(uid);
    this.addEntity(newPlayer);
    return newPlayer;
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
    this.entityListeners.forEach(func => func(entity));
  }

  findEntity(uid: string) {
    return this.entities.find(ent => ent.uid === uid);
  }

  removeEntity(entity: Entity) {
    this.entities = this.entities.filter(e => {
      return e !== entity;
    });
  }

  onNewEntity(listener: (e: Entity) => void) {
    this.entityListeners.push(listener);
  }
}
