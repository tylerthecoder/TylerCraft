import { Player } from "./entities/player";
import { World } from "./world/world";
import { Entity } from "./entities/entity";
import { IDim, IAction } from "../types";
import { Cube } from "./entities/cube";

export class Game {
  // TODO: change this to a map from uid to Entity
  entities: Entity[] = [];
  entityListeners: Array<(e: Entity) => void> = [];

  actionListener: ((actions: IAction[]) => void) | null;

  // these are just actions that can be handled by the client (related to rendering and such)
  clientActionListener: ((actions: IAction) => void) | null;

  actions: IAction[] = [];

  world = new World(this);

  get players() {
    return this.entities.filter(ent => ent instanceof Player);
  }

  update(delta: number) {
    // get all of the actions
    // there could also be actions that came from the socket
    let myActions: IAction[] = [];
    for (const entity of this.entities) {
      if (entity instanceof Player) {
        const playerActions = entity.getActions();
        myActions = myActions.concat(playerActions);
      }
    }

    this.actions.push(...myActions);

    if (this.actionListener) {
      this.actionListener(this.actions);
    }

    let failSafe = 0;
    while (this.actions.length > 0 && failSafe < 100) {
      const action = this.actions[0];
      const status = this.handleAction(action);

      if (!status && this.clientActionListener) {
        this.clientActionListener(action);
      }

      // remove the first element from actions
      this.actions.shift();

      failSafe++;
    }

    if (failSafe > 100) {
      throw new Error("Uh Oh");
    }


    // delete all of the actions
    this.actions = [];

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

  protected handleAction(action: IAction) {
    if (action.playerJump) {
      const player = this.findEntity(action.playerJump.uid) as Player;
      player.jump();
      return action.playerJump.uid;
    } else if (action.setEntVel) {
      const entity = this.findEntity(action.setEntVel!.uid);
      entity.vel = action.setEntVel!.vel.slice(0) as IDim;
    } else if (action.playerLeftClick) {
      const newCube = new Cube(
        "leaf",
        action.playerLeftClick.newCubePos
      );

      this.world.addBlock(newCube);
    } else if (action.playerRightClick) {
      this.world.removeBlock(action.playerRightClick.entity as Cube);
    } else if (action.addBlock) {
      this.world.addBlock(action.addBlock);
    } else if (action.removeBlock) {
      this.world.removeBlock(action.removeBlock);
    } else {
      return false;
    }
    return true;
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
