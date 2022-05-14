import { Player } from "./entities/player";
import { ISerializedWorld, World } from "./world/world";
import { Entity } from "./entities/entity";
import { Cube } from "./entities/cube";
import { Vector3D } from "./utils/vector";
import { MovableEntity } from "./entities/moveableEntity";
import { ISocketMessage, IWorldData, WorldModel } from "./types";
import { CONFIG, IConfig, setConfig } from "./config";
import { EntityHolder, ISerializedEntities } from "./entities/entityHolder";
import Random from "./utils/random";
import { GameAction, GameActionType } from "./gameActions";
import { GameStateDiff, IGameDiff } from "./gameStateDiff";
import { AbstractScript } from "./scripts/AbstractScript";

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


// Receives client actions from somewhere.
// Generate dirty entities and dirty chunks.

export class Game {
  public gameId: string;
  public name: string;
  // protected actions: IAction[] = [];
  public entities: EntityHolder;
  public world: World;
  multiPlayer: boolean;

  private stateDiff: GameStateDiff;

  constructor(
    /**
      The main script to control the game
      Usually will be the ClientGame
    */
    private gameScript: AbstractScript,
    private worldModel: WorldModel,
    worldData: IWorldData,
  ) {
    Random.setSeed(worldData.config.seed);

    this.stateDiff = new GameStateDiff(this);

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


  async load() {
    await this.world.load();
    console.log("World Loaded");
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
    this.gameScript.update(delta, this.stateDiff);

    // TODO keep track of if an entity modifies a chunk and return it here
    this.entities.update(this.world, delta);

    this.stateDiff.clear();
  }


  /** This happens on a fast loop. Mark things that change as dirty */
  public handleAction(action: GameAction) {
    // console.log("Handling Action", action);

    switch (action.type) {
      // case GameActionType.addEntity: {
      //   const { ent } = action.payload;
      //   const entity = deserializeEntity(ent);
      //   this.entities.add(entity);
      //   return;
      // }

      // case IActionType.removeEntity: {
      //   const payload = action.payload;
      //   const entity = findEntity(payload.uid);
      //   if (!entity) return;
      //   this.removeEntity(entity.uid);
      //   return;
      // }
      case GameActionType.Rotate: {
        const { playerRot, playerUid } = action;
        const player = this.entities.get<Player>(playerUid);
        player.rot = new Vector3D(playerRot);
        return;
      }

      case GameActionType.Jump: {
        const { playerUid } = action;
        const player = this.entities.get<Player>(playerUid);
        player.tryJump();
        return;
      }

      case GameActionType.PlaceBlock: {
        const payload = action.payload;
        console.log("Placing Block", payload);
        const newCube = new Cube(payload.blockType, new Vector3D(payload.blockPos), payload.blockData);
        this.world.addBlock(newCube);
        return;
      }

      case IActionType.removeBlock: {
        const payload = action.payload;
        this.world.removeBlock(new Vector3D(payload.blockPos));
        break;
      }

      case IActionType.playerSetPos: {
        const payload = action.payload;
        const entity = findEntity<MovableEntity>(payload.uid);
        if (!entity) {
          console.log("Couldn't find entity", payload.uid);
          return;
        }
        entity.pos = new Vector3D(payload.pos);
        return payload.uid;
      }

      case IActionType.setEntVel: {
        const payload = action.payload;
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
        const payload = action.payload;
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


  /** Currently only sent by server. Will quickly update the state of the game */
  public handleStateDiff(stateDiff: IGameDiff) {

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
