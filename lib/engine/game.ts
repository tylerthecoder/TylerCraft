import { Player } from "./entities/player/player.js";
import { ISerializedWorld, World } from "./world/world.js";
import { CONFIG, IConfig, setConfig } from "./config.js";
import { EntityHolder, ISerializedEntities } from "./entities/entityHolder.js";
import { Random } from "./utils/random.js";
import { GameActionHandler, GameAction } from "./gameActions.js";
import { GameStateDiff, GameDiffDto } from "./gameStateDiff.js";
import CubeHelpers, { Cube } from "./entities/cube.js";
import { Entity, EntityDto, getChunkId, ISerializedChunk } from "./index.js";
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

  static make(dto: IContructGameOptions, gameSaver: IGameSaver) {
    const world = World.make(dto.world);
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
    script: T,
    ...args: ConstructorParameters<T> extends [Game, ...infer R] ? R : never
  ): InstanceType<T> {
    const s = new script(this, ...args);
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

  public getScriptActions(): IGameScript[] {
    const scriptsWithActions = [];
    for (const s of this.gameScripts) {
      if (s.actions || s.config) {
        scriptsWithActions.push(s);
      }
    }
    return scriptsWithActions;
  }

  public async setupScripts() {
    for (const script of this.gameScripts) {
      await script.setup?.();
    }
  }

  // This could maybe be a game script
  public startTimer() {
    let lastTime = 0;
    const update = () => {
      const now = Date.now();
      const diff = now - lastTime;
      lastTime = now;

      // Idk if this is still needed
      if (diff > 100) {
        console.log("Skipping update, time diff is too large", diff);
        return;
      }
      this.update(diff);
    };

    setInterval(update, 1000 / 40);
  }

  public update(delta: number) {
    this.entities.update(this, this.world, delta);

    for (const script of this.gameScripts) {
      script.update?.(delta);
    }

    for (const script of this.gameScripts) {
      script.onGameStateDiff?.(this.stateDiff);
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
        this.upsertChunk(update, { updateState: false });
      }
    }

    if (stateDiff.entities?.add) {
      const adds = stateDiff.entities.add;
      for (const add of adds) {
        const ent = this.entities.createEntity(add);
        this.addEntity(ent, { updateState: false });
      }
    }

    if (stateDiff.entities.update) {
      const updates = stateDiff.entities.update;
      for (const update of updates) {
        this.updateEntity(update, { updateState: false });
      }
    }

    if (stateDiff.entities.remove) {
      const removes = stateDiff.entities.remove;
      for (const removeId of removes) {
        this.removeEntity(this.entities.get(removeId), { updateState: false });
      }
    }
  }

  upsertChunk(
    chunk: ISerializedChunk,
    opts: { updateState: boolean } = { updateState: true }
  ) {
    console.log("Game: Upserting chunk", chunk, opts);

    const chunkId = getChunkId(chunk);

    this.world.updateChunk(chunk);
    if (opts.updateState) {
      this.stateDiff.updateChunk(chunkId);
    }

    for (const script of this.gameScripts) {
      script.onChunkUpdate?.(chunkId);
    }
  }

  placeBlock(
    cube: Cube,
    opts: { updateState: boolean } = { updateState: true }
  ) {
    console.log("Game: Adding block", cube);

    // Check if an entity is in the way
    // Soon we will move this to rust
    for (const entity of this.entities.iterable()) {
      if (CubeHelpers.isPointInsideOfCube(cube, entity.pos)) {
        console.log("Not adding block, entity in the way");
        return;
      }
    }

    const updatedChunks = this.world.addBlock(cube);
    if (opts.updateState) {
      for (const chunkId of updatedChunks) {
        this.stateDiff.updateChunk(chunkId);
        for (const script of this.gameScripts) {
          script.onChunkUpdate?.(chunkId);
        }
      }
    }
  }

  removeBlock(
    cube: Cube,
    opts: { updateState: boolean } = { updateState: true }
  ) {
    console.log("Game: Removing block", cube);
    const updatedChunks = this.world.removeBlock(cube.pos);
    if (opts.updateState) {
      for (const chunkId of updatedChunks) {
        this.stateDiff.updateChunk(chunkId);
        for (const script of this.gameScripts) {
          script.onChunkUpdate?.(chunkId);
        }
      }
    }
  }

  addPlayer(
    uid: string,
    opts: { updateState: boolean } = { updateState: true }
  ): Player {
    console.log("Game: Adding player", uid);

    const player = this.entities.createOrGetPlayer(uid);
    if (opts.updateState) {
      this.stateDiff.updateEntity(player.uid);
    }
    for (const script of this.gameScripts) {
      script.onNewEntity?.(player);
    }
    return player;
  }

  addEntity(
    entity: Entity,
    opts: { updateState: boolean } = { updateState: true }
  ) {
    console.log("Game: Adding entity", entity);
    this.entities.add(entity);

    if (opts.updateState) {
      this.stateDiff.updateEntity(entity.uid);
    }

    for (const script of this.gameScripts) {
      script.onNewEntity?.(entity);
    }
  }

  updateEntity(
    entity: EntityDto,
    opts: { updateState: boolean } = { updateState: true }
  ) {
    console.log("Game: Updating entity", entity);
    this.entities.updateEntity(entity);
    if (opts.updateState) {
      this.stateDiff.updateEntity(entity.uid);
    }
  }

  removeEntity(
    entity: Entity,
    opts: { updateState: boolean } = { updateState: true }
  ) {
    console.log("Game: Removing entity", entity);
    this.entities.remove(entity.uid);

    if (opts.updateState) {
      this.stateDiff.removeEntity(entity.uid);
    }

    for (const script of this.gameScripts) {
      script.onRemovedEntity?.(entity);
    }
  }

  async save() {
    await this.gameSaver.save(this);
  }
}
