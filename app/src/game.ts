import { Player } from "./entities/player";
import { World } from "./world/world";
import { Entity } from "./entities/entity";
import { IDim, IAction, IActionType } from "../types";
import { Cube } from "./entities/cube";
import { Vector3D, Vector } from "./utils/vector";
import { Projectile } from "./entities/projectile";
import { MovableEntity } from "./entities/moveableEntity";
import { ISocketMessage } from "../types/socket";

export class Game {
  protected actions: IAction[] = [];

  // TODO: change this to a map from uid to Entity
  entities: Entity[] = [];
  world = new World(this);
  mainPlayer: Player;
  multiPlayer = true;

  setup() {
    this.mainPlayer = this.addPlayer(true);
  }

  get players() {
    return this.entities.filter(ent => ent instanceof Player);
  }

  update(delta: number) {
    // get all of the actions
    // there could also be actions that came from the socket
    let myActions: IAction[] = [];
    for (const entity of this.entities) {
      const playerActions = entity.getActions();
      myActions = myActions.concat(playerActions);
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
      // if (entity.tangible) {
        this.world.pushOut(entity);

        for (const e of this.entities) {
          if (e === entity) continue;
          const isCollide = e.isCollide(entity);
          if (isCollide) {
            entity.pushOut(e);
          }
        }
      // }

    }
  }

  protected handleAction(action: IAction) {
    // console.log("Handling Action", action);
    switch(action.type) {
    case IActionType.addEntity: {
      const {ent} = action.addEntity;
      if (ent.type === "projectile") {
        this.addEntity(Projectile.deserialize(ent));
      }
      return;
    }

    case IActionType.removeEntity: {
      const payload = action.removeEntity;
      const entity = this.findEntity(payload.uid);
      if (!entity) return;
      this.removeEntity(entity.uid);
      return;
    }

    case IActionType.playerPlaceBlock:
      const newCube = new Cube(
        action.playerPlaceBlock.blockType,
        new Vector3D(action.playerPlaceBlock.blockPos)
      );
      this.world.addBlock(newCube);
      break;

    case IActionType.removeBlock:
      this.world.removeBlock(new Vector3D(action.removeBlock.blockPos));
      break;

    case IActionType.playerSetPos: {
      const payload = action.playerSetPos;
      const player = this.findEntity(payload.uid) as Player;
      player.pos = new Vector(payload.pos);
      return action.playerSetPos.uid;
    }

    case IActionType.setEntVel: {
      const payload = action.setEntVel;
      const entity = this.findEntity(payload.uid) as MovableEntity;
      if (!entity) {
        console.log(payload.uid);
        return;
      }
      entity.vel = new Vector(payload.vel);
      return payload.uid;
    }

    case IActionType.playerFireball:
      const player = this.findEntity(action.playerFireball.uid) as Player;
      player.fireball();
      return action.playerFireball.uid;

    case IActionType.hurtEntity: {
      const payload = action.hurtEntity;
      const entity = this.findEntity(payload.uid) as Player;
      if (!entity) {
        console.log(payload.uid);
        return;
      }
      entity.hurt(payload.amount);
    }


    default:
      return false;

    }

    return true;
  }

  addAction(action: IAction) {
    this.actions.push(action);
  }

  addActions(actions: IAction[]) {
    this.actions.push(...actions);
  }

  addPlayer(realness: boolean, uid?: string): Player {
    const newPlayer = new Player(realness);
    if (uid) newPlayer.setUid(uid);
    this.addEntity(newPlayer);
    return newPlayer;
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
    this.onNewEntity(entity);
  }

  findEntity(uid: string) {
    return this.entities.find(ent => ent.uid === uid);
  }

  removeEntity(uid: string) {
    this.onRemoveEntity(uid);
    this.entities = this.entities.filter(e => {
      return e.uid !== uid;
    });
  }

  // for the subclasses to override so they can "listen" to events
  onNewEntity(_entity: Entity) {}
  onRemoveEntity(_uid: string) {}
  onActions(_actions: IAction[]) {}
  // these are just actions that can be handled by the client (related to rendering and such)
  clientActionListener(_action: IAction) {}
  sendMessageToServer(_message: ISocketMessage) {}
}
