import { Player } from "./entities/player/player.js";
import { ISerializedWorld, World } from "./world/world.js";
import { IGameData, IGameSaver } from "./types.js";
import { CONFIG, IConfig, setConfig } from "./config.js";
import { EntityHolder, ISerializedEntities } from "./entities/entityHolder.js";
import { Random } from "./utils/random.js";
import { GameActionHandler, GameAction } from "./gameActions.js";
import { GameStateDiff, GameDiffDto } from "./gameStateDiff.js";
import { Vector2D } from "./utils/vector.js";
import { GameController } from "./controllers/controller.js";
import CubeHelpers, { Cube } from "./entities/cube.js";
import { Entity, EntityController } from "./index.js";

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
  public multiPlayer: boolean;
  public stateDiff: GameStateDiff;
  private gameActionHandler: GameActionHandler;
  public gameController: GameController | null = null;
  private gameSaver: IGameSaver;

  static async make(gameData: IGameData): Promise<Game> {
    const entities = new EntityHolder(gameData.data?.entities);
    const world = await World.make(gameData.chunkReader, gameData.data?.world);
    const entityControllers = new Map<string, EntityController[]>();

    const game = new Game(entities, entityControllers, world, gameData);

    return game;
  }

  constructor(
    public entities: EntityHolder,
    public entityControllers: Map<string, EntityController[]>,
    public world: World,
    gameData: IGameData
  ) {
    Random.setSeed(gameData.config.seed);

    this.gameSaver = gameData.gameSaver;
    this.stateDiff = new GameStateDiff(this);
    this.gameActionHandler = new GameActionHandler(this);

    this.multiPlayer = Boolean(gameData.multiplayer);

    this.gameId = gameData.id;
    this.name = gameData.name;

    if (gameData.config) {
      setConfig({
        ...CONFIG,
        ...gameData.config,
      });
    }
  }

  public serialize(): ISerializedGame {
    return {
      config: CONFIG,
      entities: this.entities.serialize(),
      world: this.world.serialize(),
      gameId: this.gameId,
      name: this.name,
    };
  }

  private updateListeners: ((delta: number) => void)[] = [];
  addUpdateListener(listener: (delta: number) => void) {
    this.updateListeners.push(listener);
  }

  public update(delta: number) {
    this.gameController?.update(delta);

    for (const entityController of this.entityControllers.values()) {
      for (const controller of entityController) {
        controller.update();
      }
    }

    this.entities.update(this, this.world, delta);

    this.stateDiff.clear();

    // Tell everyone else
    for (const listener of this.updateListeners) {
      listener(delta);
    }
  }

  private gameActionListeners: ((action: GameAction) => void)[] = [];
  addGameActionListener(listener: (action: GameAction) => void) {
    this.gameActionListeners.push(listener);
  }
  /** This happens on a fast loop. Mark things that change as dirty */
  public handleAction(action: GameAction) {
    this.gameActionHandler.handle(action);
    for (const listener of this.gameActionListeners) {
      listener(action);
    }
  }

  /** Currently only sent by server. Will quickly update the state of the game */
  public handleStateDiff(stateDiff: GameDiffDto) {
    // Might not have to do this because the updating below will append the updates
    this.stateDiff.appendDto(stateDiff);

    console.log("Handling State Diff", stateDiff);
    if (stateDiff.chunks.update) {
      const updates = stateDiff.chunks.update;
      for (const update of updates) {
        this.world.updateChunk(
          new Vector2D([update.position.x, update.position.y]),
          update
        );
      }
    }

    if (stateDiff.entities?.add) {
      const adds = stateDiff.entities.add;
      for (const add of adds) {
        const ent = this.entities.createEntity(add);
        console.log("Adding entity from stateDiff", add);
        this.entities.add(this.stateDiff, ent);
      }
    }

    if (stateDiff.entities.update) {
      const updates = stateDiff.entities.update;
      for (const update of updates) {
        this.entities.updateEntity(update);
      }
    }

    if (stateDiff.entities.remove) {
      const removes = stateDiff.entities.remove;
      for (const removeId of removes) {
        console.log("Removing entity", removeId);
        this.entities.remove(removeId);
        // remove the controller for the entity
        const controllers = this.entityControllers.get(removeId);

        if (controllers) {
          for (const controller of controllers) {
            controller.cleanup();
            this.entityControllers.delete(removeId);
          }
        }

        console.log("EntityControllers", this.entityControllers);
      }
    }
  }

  placeBlock(cube: Cube) {
    console.log("Game: Adding block", cube);
    // Check if an entity is in the way
    for (const entity of this.entities.iterable()) {
      if (CubeHelpers.isPointInsideOfCube(cube, entity.pos)) {
        console.log("Not adding block, entity in the way");
        return;
      }
    }

    this.world.addBlock(this.stateDiff, cube);
  }

  removeBlock(cube: Cube) {
    console.log("Removing block", cube);
    this.world.removeBlock(this.stateDiff, cube.pos);
  }

  addPlayer(uid: string): Player {
    return this.entities.createPlayer(this.stateDiff, uid);
  }

  addEntity(entity: Entity) {
    console.log("Adding entity", entity);
    this.entities.add(this.stateDiff, entity);
  }

  removeEntity(entity: Entity) {
    console.log("Removing entity", entity);
    this.entities.remove(entity.uid);
  }

  async save() {
    await this.gameSaver.save(this);
  }
}
