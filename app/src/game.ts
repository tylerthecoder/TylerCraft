import { Player } from "./entities/player";
import { World } from "./world/world";
import { Entity } from "./entities/entity";
import { IDim, IAction } from "../types";
import { Cube } from "./entities/cube";
import { BLOCK_DATA } from "./blockdata";
import { arrayAdd } from "./utils";

export class Game {
  // TODO: change this to a map from uid to Entity
  entities: Entity[] = [];
  entityListeners: Array<(e: Entity) => void> = [];

  actionListener: ((actions: IAction[]) => void) | null;

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

    // apply all of the actions
    for (const action of this.actions) {
      this.handleAction(action);
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

  // moveEntity(uid: string, dir: IDim) {
  //   const entity = this.findEntity(uid);
  //   entity.move(dir.map(d => d * entity.speed) as IDim);

  // handles actions and returns affected uids
  handleAction(action: IAction) {
    // console.log("Handling action: ", action);
    if (action.playerJump) {
      const player = this.findEntity(action.playerJump.uid) as Player;
      player.jump();
      return action.playerJump.uid;
    }

    if (action.setEntVel) {
      const entity = this.findEntity(action.setEntVel!.uid);
      entity.vel = action.setEntVel!.vel.slice(0) as IDim;
    }

    if (action.playerLeftClick) {
      const newCube = new Cube(
        "grass",
        action.playerLeftClick.newCubePos
      );

      this.handleAction({
        addBlock: newCube,
      });
    }

    if (action.playerRightClick) {

      this.handleAction({
        removeBlock: action.playerRightClick.entity as Cube,
      });
    }

    if (action.addBlock) {
      this.world.addBlock(action.addBlock);
    }

    if (action.removeBlock) {
      this.world.removeBlock(action.removeBlock);
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
