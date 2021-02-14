import { Player } from "./entities/player";
import { ISerializedWorld, World } from "./world/world";
import { Entity } from "./entities/entity";
import { Cube } from "./entities/cube";
import { Vector3D, Vector } from "./utils/vector";
import { MovableEntity } from "./entities/moveableEntity";
import { IAction, IActionType, ISocketMessage, IWorldData, WorldModel } from "./types";
import { CONFIG, IConfig, setConfig } from "./config";
import { deserializeEntity } from "./serializer";
import { EntityHolder, ISerializedEntities } from "./entities/entityHolder";
import Random from "./utils/random";

export interface ISerializedGame {
  config: IConfig;
  entities: ISerializedEntities;
  world: ISerializedWorld;
  gameId: string;
  name: string;
}

export interface IGameMetadata {
  gameId: string;
  name: string;
}

export class Game {
  public gameId: string;
  public name: string;
  protected actions: IAction[] = [];
  public entities: EntityHolder;
  public world: World;
  multiPlayer: boolean;

  constructor(
    private worldModel: WorldModel,
    worldData: IWorldData,
  ) {
    Random.setSeed(worldData.config.seed);

    this.multiPlayer = Boolean(worldData.multiplayer);

    this.world = worldData.data ?
      new World(
        this,
        worldData.chunkReader,
        worldData.data.world
      )
      :
      new World(
        this,
        worldData.chunkReader
      );

    this.entities = worldData.data ?
      new EntityHolder(
        this,
        worldData.data.entities
      )
      :
      new EntityHolder(
        this
      );

    this.gameId = worldData.worldId;
    this.name = worldData.name;

    if (worldData.config) {
      setConfig({
        ...CONFIG,
        ...worldData.config,
      });
    }

  }

  serialize(): ISerializedGame {
    return {
      config: CONFIG,
      entities: this.entities.serialize(),
      world: this.world.serialize(),
      gameId: this.gameId,
      name: this.name,
    };
  }

  update(delta: number) {
    // get all of the actions
    // there could also be actions that came from the socket

    const entityActions = this.entities.getActions();
    this.actions.push(...entityActions);

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

    if (failSafe > 100) throw new Error("Uh Oh");

    // delete all of the actions
    this.actions = [];

    this.entities.update(this.world, delta)
  }

  protected handleAction(action: IAction) {
    // console.log("Handling Action", action);

    const findEntity = <T extends Entity>(uid: string) => this.entities.get(uid) as T | undefined;

    switch (action.type) {
      case IActionType.addEntity: {
        const { ent } = action.addEntity!;
        const entity = deserializeEntity(ent);
        this.entities.add(entity);
        return;
      }

      case IActionType.removeEntity: {
        const payload = action.removeEntity!;
        const entity = findEntity(payload.uid);
        if (!entity) return;
        this.removeEntity(entity.uid);
        return;
      }

      case IActionType.playerPlaceBlock: {
        const payload = action.playerPlaceBlock!;
        const newCube = new Cube(payload.blockType, new Vector3D(payload.blockPos));
        this.world.addBlock(newCube);
        return;
      }

      case IActionType.removeBlock: {
        const payload = action.removeBlock!
        this.world.removeBlock(new Vector3D(payload.blockPos));
        break;
      }

      case IActionType.playerSetPos: {
        const payload = action.playerSetPos!;
        const entity = findEntity<MovableEntity>(payload.uid);
        if (!entity) {
          console.log("Couldn't find entity", payload.uid);
          return;
        }
        entity.pos = new Vector3D(payload.pos);
        return payload.uid;
      }

      case IActionType.setEntVel: {
        const payload = action.setEntVel!;
        const entity = findEntity(payload.uid) as MovableEntity;
        if (!entity) {
          console.log("Couldn't find entity", payload.uid);
          return;
        }
        entity.vel = new Vector3D(payload.vel);
        return payload.uid;
      }

      case IActionType.playerFireball: {
        const payload = action.playerFireball!
        const player = findEntity(payload.uid) as Player;
        player.fireball();
        return payload.uid;
      }

      case IActionType.hurtEntity: {
        const payload = action.hurtEntity!;
        const entity = findEntity(payload.uid) as Player;
        if (!entity) {
          console.log("Entity not found", payload.uid);
          return;
        }
        entity.hurt(payload.amount);
        break;
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

  addPlayer(realness: boolean, uid: string): Player {
    return this.entities.createOrGetPlayer(realness, uid);
  }

  removeEntity(uid: string) {
    this.onRemoveEntity(uid);
    this.entities.remove(uid);
  }

  save() {
    this.worldModel.saveWorld(this);
  }

  // for the subclasses to override so they can "listen" to events
  onNewEntity(_entity: Entity) {/* NO-OP */ }
  onRemoveEntity(_uid: string) {/* NO-OP */ }
  onActions(_actions: IAction[]) {/* NO-OP */ }
  // these are just actions that can be handled by the client (related to rendering and such)
  clientActionListener(_action: IAction) {/* NO-OP */ }
  sendMessageToServer(_message: ISocketMessage) {/* NO-OP */ }
}
