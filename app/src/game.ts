import { Player } from "./entities/player";
import { ISerializedWorld, World } from "./world/world";
import { IWorldData, WorldModel } from "./types";
import { CONFIG, IConfig, setConfig } from "./config";
import { EntityHolder, ISerializedEntities } from "./entities/entityHolder";
import Random from "./utils/random";
import { GameAction, GameActionData, GameActionHandler, GameActionHolder } from "./gameActions";
import { GameStateDiff, GameDiffDto } from "./gameStateDiff";
import { AbstractScript } from "./scripts/AbstractScript";
import { Vector2D } from "./utils/vector";

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

export class Game<Actions = GameAction> {
  public gameId: string;
  public name: string;
  public entities: EntityHolder;
  public world: World;
  public multiPlayer: boolean;
  public stateDiff: GameStateDiff;
  public gameScript: AbstractScript;

  private gameActionHandler: GameActionHandler;
  private worldModel: WorldModel;

  private previousTime = Date.now();


  public get mainPlayer() {
    return this.entities.get;
  }

  constructor(
    /**
      The main script to control the game
      Usually will be the ClientGame
    */
    gameScript: { new(game: Game): AbstractScript },
    worldModel: WorldModel,
    worldData: IWorldData,
  ) {
    this.worldModel = worldModel;
    Random.setSeed(worldData.config.seed);

    this.stateDiff = new GameStateDiff(this);
    this.gameActionHandler = new GameActionHandler(this);

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

    // Generate this last so the game script has access to all the Game's data
    this.gameScript = new gameScript(this);

    this.load();
  }


  async load() {
    await this.world.load();
    console.log("World Loaded");

    await this.gameScript.init();

    // Setup timer
    this.previousTime = Date.now();
    this.update();
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
  public update() {
    const now = Date.now();
    const delta = now - this.previousTime;

    this.gameScript.update(delta, this.stateDiff);

    this.entities.update(this.world, delta);

    this.stateDiff.clear();

    this.previousTime = now;

    setTimeout(this.update.bind(this), 1000 / 40);
  }


  /** This happens on a fast loop. Mark things that change as dirty */
  public handleAction<T extends GameAction, U extends GameActionData[T]>(action: T, actionData: U) {
    const actionHolder = GameActionHolder.create(action, actionData)
    this.gameScript.onAction(actionHolder);
    this.gameActionHandler.handle(actionHolder);
  }

  /** Currently only sent by server. Will quickly update the state of the game */
  public handleStateDiff(stateDiff: GameDiffDto) {
    // Might not have to do this because the updating below will append the updates
    this.stateDiff.appendDto(stateDiff);

    console.log("Handling State Diff", stateDiff);
    if (stateDiff.chunks.update) {
      const updates = stateDiff.chunks.update;
      for (const update of updates) {
        const chunkPos = Vector2D.fromIndex(update.chunkPos);
        this.world.updateChunk(chunkPos, update);
      }
    }

    if (stateDiff.entities?.add) {
      const adds = stateDiff.entities.add;
      for (const add of adds) {
        const ent = this.entities.createEntity(add);
        this.entities.add(ent);
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

  addPlayer(uid: string): Player {
    return this.entities.createOrGetPlayer(uid);
  }

  save() {
    this.worldModel.saveWorld(this);
  }
}
