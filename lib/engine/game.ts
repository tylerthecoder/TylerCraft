import { Player } from "./entities/player/player.js";
import { ISerializedWorld, World } from "./world/world.js";
import { CONFIG, IConfig, setConfig } from "./config.js";
import { EntityHolder, ISerializedEntities } from "./entities/entityHolder.js";
import { Random } from "./utils/random.js";
import { GameActionHandler, GameAction } from "./gameActions.js";
import { GameStateDiff, GameDiffDto } from "./gameStateDiff.js";
import { Vector2D } from "./utils/vector.js";
import CubeHelpers, { Cube } from "./entities/cube.js";
import { Entity, ISerializedChunk } from "./index.js";
import { IGameScript, IGameScriptConstuctor } from "./game-script.js";

export interface ISerializedGame {
  name: string;
  config: IConfig;
  gameId: string;
  entities?: ISerializedEntities;
  world?: ISerializedWorld;
}

export interface IGameMetadata {
  gameId: string;
  name: string;
}

export type ICreateGameOptions = Pick<ISerializedGame, "config" | "name">;

export type IContructGameOptions = Omit<ISerializedGame, "gameId"> & {
  gameId?: string;
};

export interface IChunkReader {
  getChunk(chunkPos: string): Promise<ISerializedChunk>;
}

export interface IGameSaver {
  save(game: Game): Promise<void>;
}

// Receives client actions from somewhere.
// Generate dirty entities and dirty chunks.
export class Game {
  public stateDiff: GameStateDiff;
  private gameActionHandler: GameActionHandler;
  private gameScripts: IGameScript[] = [];

  static async make(
    dto: IContructGameOptions,
    chunkReader: IChunkReader,
    gameSaver: IGameSaver
  ) {
    const world = await World.make(chunkReader, dto.world);
    const entities = new EntityHolder(dto.entities);

    const gameId = dto.gameId || Math.random().toString().slice(2, 10);

    return new Game(gameId, dto.name, dto.config, entities, world, gameSaver);
  }

  constructor(
    public gameId: string,
    public name: string,
    public config: IConfig,
    public entities: EntityHolder,
    public world: World,
    private gameSaver: IGameSaver
  ) {
    Random.setSeed(this.config.seed);
    this.stateDiff = new GameStateDiff(this);
    this.gameActionHandler = new GameActionHandler(this);

    setConfig({
      ...CONFIG,
      ...this.config,
    });
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

  public addGameScript<T extends IGameScriptConstuctor>(
    script: T
  ): InstanceType<T> {
    const s = new script(this);
    this.gameScripts.push(s);
    return s as InstanceType<T>;
  }

  public getGameScript<T extends IGameScriptConstuctor>(
    script: T
  ): InstanceType<T> {
    for (const s of this.gameScripts) {
      if (s instanceof script) {
        return s as InstanceType<T>;
      }
    }

    throw new Error("Script not found");
  }

  public setupScripts() {
    for (const script of this.gameScripts) {
      script.setup?.();
    }
  }

  public update(delta: number) {
    this.entities.update(this, this.world, delta);

    if (CONFIG.terrain.infiniteGen) {
      for (const entity of this.entities.iterable()) {
        const chunkIds = this.world.getChunkPosAroundPoint(entity.pos);
        for (const chunkId of chunkIds) {
          // Don't await it
          this.world.loadChunk(chunkId);
        }
      }
    }

    for (const script of this.gameScripts) {
      script.update?.(delta);
    }

    this.stateDiff.clear();
  }

  /** This happens on a fast loop. Mark things that change as dirty */
  public handleAction(action: GameAction) {
    this.gameActionHandler.handle(action);
    for (const script of this.gameScripts) {
      script.onGameAction?.(action);
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
        this.world.updateChunk(update);
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
    return this.entities.createOrGetPlayer(this.stateDiff, uid);
  }

  addEntity(entity: Entity) {
    console.log("Adding entity", entity);
    this.entities.add(this.stateDiff, entity);

    for (const script of this.gameScripts) {
      script.onNewEntity?.(entity);
    }
  }

  removeEntity(entity: Entity) {
    console.log("Removing entity", entity);
    this.entities.remove(entity.uid);

    for (const script of this.gameScripts) {
      script.onRemovedEntity?.(entity);
    }
  }

  async save() {
    await this.gameSaver.save(this);
  }
}
