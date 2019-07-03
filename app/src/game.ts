import { Player } from "./entities/player";
import { World } from "./world/world";
import { Entity } from "./entities/entity";

export class Game {
  entities: Entity[] = [];
  entityListeners: Array<(e: Entity) => void> = [];

  world = new World();

  addPlayer(uid: string) {
    const newPlayer = new Player(this);
    newPlayer.setUid(uid);
    this.addEntity(newPlayer);
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
        const isCollide = e.isCollide(entity);
        if (isCollide) {
          e.pushOut(entity);
        }
      }
    }
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
    this.entityListeners.forEach(func => func(entity));
  }

  onNewEntity(listener: (e: Entity) => void) {
    this.entityListeners.push(listener);
  }
}
