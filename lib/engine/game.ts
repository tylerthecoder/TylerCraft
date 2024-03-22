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

export abstract class Game {
  public gameId: string;
  public name: string;
  public multiPlayer: boolean;
  public stateDiff: GameStateDiff;
  public abstract controller: GameController;

  private gameActionHandler: GameActionHandler;
  private previousTime = Date.now();

  private gameSaver: IGameSaver;

  constructor(
    public entities: EntityHolder,
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

  // abstract load(): Promise<void>;
  async baseLoad() {
    // Setup timer
    this.previousTime = Date.now();
    this.baseUpdate();
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

  /**
   * Called 20 times a second
   */
  abstract update(delta: number, stateDiff: GameStateDiff): void;
  public baseUpdate() {
    const now = Date.now();
    const delta = now - this.previousTime;

    this.controller.update(delta);

    this.update(delta, this.stateDiff);

    this.entities.update(this.world, delta);

    this.stateDiff.clear();

    this.previousTime = now;

    setTimeout(this.baseUpdate.bind(this), 1000 / 40);
  }

  /** This happens on a fast loop. Mark things that change as dirty */
  abstract onGameAction(action: GameAction): void;
  public handleAction(action: GameAction) {
    this.onGameAction(action);
    this.gameActionHandler.handle(action);
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
      for (const remove of removes) {
        this.entities.remove(remove);
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

  async save() {
    await this.gameSaver.save(this);
  }
}
