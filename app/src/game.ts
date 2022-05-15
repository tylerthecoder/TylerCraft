import { Player } from "./entities/player";
import { ISerializedWorld, World } from "./world/world";
import { Cube, isPointInsideOfCube } from "./entities/cube";
import { Vector3D } from "./utils/vector";
import { IWorldData, WorldModel } from "./types";
import { CONFIG, IConfig, setConfig } from "./config";
import { EntityHolder, ISerializedEntities } from "./entities/entityHolder";
import Random from "./utils/random";
import { GameAction, GameActionType } from "./gameActions";
import { GameStateDiff, IGameDiff } from "./gameStateDiff";
import { AbstractScript } from "./scripts/AbstractScript";
import { BLOCKS, ExtraBlockData } from "./blockdata";

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
  public entities: EntityHolder;
  public world: World;
  public multiPlayer: boolean;
  public stateDiff: GameStateDiff;
  public gameScript: AbstractScript;

  private worldModel: WorldModel;

  private previousTime = Date.now();

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
    this.gameScript = new gameScript(this);
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

    await this.gameScript.load();

    // Setup timer
    this.previousTime = Date.now();
    this.update();
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


  /**
   * Called 20 times a second
   */
  update() {
    const now = Date.now();
    const delta = now - this.previousTime;

    this.gameScript.update(delta, this.stateDiff);

    // TODO keep track of if an entity modifies a chunk and return it here
    this.entities.update(this.world, delta);

    this.stateDiff.clear();

    this.previousTime = now;

    setTimeout(this.update.bind(this), 1000 / 20);
  }


  /** This happens on a fast loop. Mark things that change as dirty */
  public handleAction(action: GameAction) {
    // console.log("Handling Action", action);

    this.gameScript.onActions(action);

    switch (action.type) {
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
        console.log("Placing Block");
        const { blockType, cameraData } = action;

        const lookingData = this.world.lookingAt(cameraData);
        if (!lookingData) return;
        const cube = lookingData.entity as Cube;

        // check to see if any entity is in block
        for (const entity of this.entities.iterable()) {
          if (isPointInsideOfCube(cube, entity.pos)) {
            return;
          }
        }

        let extraBlockData: ExtraBlockData | undefined = undefined;

        if (blockType === BLOCKS.image) {
          extraBlockData = {
            galleryIndex: 0,
            face: lookingData.face,
          }
        }

        const newCube = new Cube(
          blockType,
          lookingData.newCubePos as Vector3D,
          extraBlockData,
        );

        this.world.addBlock(newCube);
        return;
      }

      case GameActionType.RemoveBlock: {
        console.log("Removing Block");
        const { cameraData } = action;
        const lookingData = this.world.lookingAt(cameraData);
        if (!lookingData) return;
        const cube = lookingData.entity as Cube;
        this.world.removeBlock(cube.pos);
        return;
      }

      case GameActionType.SetPlayerPos: {
        const { playerUid, pos } = action;
        const player = this.entities.get<Player>(playerUid);
        player.pos = new Vector3D(pos);
        return;
      }

      case GameActionType.Move: {
        const { direction, playerRot, playerUid } = action;
        const player = this.entities.get<Player>(playerUid);
        // TODO this might be unnecessary
        player.rot = new Vector3D(playerRot);
        player.moveInDirection(direction);
      }
    }
  }


  /** Currently only sent by server. Will quickly update the state of the game */
  public handleStateDiff(stateDiff: IGameDiff) {
    // TODO
  }

  addPlayer(realness: boolean, uid: string): Player {
    return this.entities.createOrGetPlayer(realness, uid);
  }

  removeEntity(uid: string) {
    this.entities.remove(uid);
  }

  save() {
    this.worldModel.saveWorld(this);
  }
}
