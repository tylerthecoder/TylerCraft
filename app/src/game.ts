import { Player } from "./entities/player";
import { World } from "./world/world";
import { Entity } from "./entities/entity";
import { IDim, IAction, IActionType } from "../types";
import { Cube } from "./entities/cube";
import { BLOCKS } from "./blockdata";

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

    // send the actions to the subclass
    this.onActions(this.actions);

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

    switch(action.type) {
    case IActionType.playerJump: {
      const payload = action.playerJump;
      const player = this.findEntity(payload.uid) as Player;
      player.jump();
      return action.playerJump.uid;
    }

    case IActionType.playerPlaceBlock:
      const newCube = new Cube(
        action.playerPlaceBlock.blockType,
        action.playerPlaceBlock.newCubePos
      );
      this.world.addBlock(newCube);
      break;

    case IActionType.playerRemoveBlock:
      this.world.removeBlock(action.playerRemoveBlock.entity as Cube);
      break;

    case IActionType.playerSetPos: {
      console.log("Setting my pos");
      const payload = action.playerSetPos;
      const player = this.findEntity(payload.uid) as Player;
      player.pos = payload.pos;
      return action.playerSetPos.uid;
    }

    case IActionType.setEntVel: {
      const payload = action.setEntVel;
      const entity = this.findEntity(payload.uid);
      entity.vel = payload.vel;
      return payload.uid;
    }


    case IActionType.playerFireball:
      const player = this.findEntity(action.playerFireball.uid) as Player;
      player.fireball();
      return action.playerFireball.uid;

    default:
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
    console.log("Adding Ent", entity)
    this.entities.push(entity);
    this.onNewEntity(entity);
    // this.entityListeners.forEach(func => func(entity));
  }

  findEntity(uid: string) {
    return this.entities.find(ent => ent.uid === uid);
  }

  removeEntity(entity: Entity) {
    this.entities = this.entities.filter(e => {
      return e !== entity;
    });
  }

  // for the subclasses to override so they can "listen" to events
  onNewEntity(_entity: Entity) {}
  onActions(_actions: IAction[]) {}
}
