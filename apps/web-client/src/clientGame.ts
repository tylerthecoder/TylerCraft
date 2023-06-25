import {
  Camera,
  Game,
  ISocketMessageType,
  IWorldData,
  WorldModel,
  Player,
  GameStateDiff,
  GameAction,
  GameController,
  World,
  EntityHolder,
  CONFIG,
  EntityController,
  SocketMessage,
} from "@craft/engine";
import { EntityCamera } from "./cameras/entityCamera";
import { canvas } from "./canvas";
import WorldRenderer from "./renders/worldRender";
import { getMyUid, IExtendedWindow, IS_MOBILE, SocketInterface } from "./app";
import { XrCamera } from "./cameras/xrCamera";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { Quest2Controller } from "./controllers/playerControllers/quest2Controller";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { MouseAndKeyboardGameController } from "./controllers/gameKeyboardController";

// This class should only read game and not write.
// It uses game data to draw the game to the screen and handle user input
export class ClientGame extends Game {
  worldRenderer: WorldRenderer;
  isSpectating = false;
  camera: Camera;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];
  mainPlayer: Player;
  controller: GameController;
  entityControllers: Map<string, EntityController> = new Map();

  static async make(
    worldData: IWorldData,
    worldModel: WorldModel
  ): Promise<ClientGame> {
    // need to pick the right controller for each entity.

    const entityHolder = new EntityHolder(worldData.data?.entities);
    const world = await World.make(
      worldData.chunkReader,
      worldData.data?.world
    );

    const game = new ClientGame(entityHolder, world, worldModel, worldData);

    return game;
  }

  private constructor(
    entities: EntityHolder,
    world: World,
    worldModel: WorldModel,
    worldData: IWorldData
  ) {
    super(entities, world, worldModel, worldData);

    (window as IExtendedWindow).clientGame = this;

    console.log("ClientGame created", this);

    this.worldRenderer = new WorldRenderer(this.world, this);

    this.worldRenderer.shouldRenderMainPlayer = false;

    this.mainPlayer = entities.createOrGetPlayer(this.stateDiff, getMyUid());

    this.entityControllers.set(
      this.mainPlayer.uid,
      this.makePlayerController(this.mainPlayer)
    );

    console.log("My UID", getMyUid());

    // Create renderers for initial entities
    for (const entity of this.entities.iterable()) {
      this.worldRenderer.addEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunk of this.world.getChunks()) {
      this.worldRenderer.addChunk(chunk);
    }

    if (this.multiPlayer) {
      SocketInterface.addListener(this.onSocketMessage.bind(this));
    }

    this.isSpectating = false;
    this.camera = new EntityCamera(this.mainPlayer);
    this.worldRenderer.addEntity(this.mainPlayer);

    if (canvas.isXr) {
      this.camera = new XrCamera(this.mainPlayer);
    } else {
      this.camera = new EntityCamera(this.mainPlayer);
    }

    this.controller = new MouseAndKeyboardGameController(this);

    canvas.loop(this.renderLoop.bind(this));
  }

  private makePlayerController(player: Player): EntityController {
    if (IS_MOBILE) {
      return new MobileController(this);
    } else if (canvas.isXr) {
      return new Quest2Controller(this);
    } else {
      return new KeyboardPlayerEntityController(() => void 0, player, this);
    }
  }

  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-100);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur, 0);
    const averageMs = totTime / Math.min(this.pastDeltas.length, 100);
    const fps = 1 / (averageMs / 1000);
    return fps;
  }

  onSocketMessage(message: SocketMessage) {
    console.log("Socket Message", message);
    if (message.isType(ISocketMessageType.gameDiff)) {
      this.handleStateDiff(message.data);
    }
  }

  // Called by Game each tick,
  update(delta: number, stateDiff: GameStateDiff) {
    this.controller.update(delta);

    for (const entityController of this.entityControllers.values()) {
      entityController.update();
    }

    for (const dirtyChunkId of stateDiff.getDirtyChunks()) {
      this.worldRenderer.blockUpdate(dirtyChunkId);
    }

    for (const entityId of stateDiff.getNewEntities()) {
      const entity = this.entities.get(entityId);
      this.worldRenderer.addEntity(entity);

      // create a controller for the entity
      // if (entity instanceof Player) {
      //   const controller = new SocketPlayerController(this, entity);
      //   this.entityControllers.set(entity.uid, controller);
      // }
    }

    for (const entityId of stateDiff.getRemovedEntities()) {
      this.worldRenderer.removeEntity(entityId);

      // remove the controller for the entity
      const controller = this.entityControllers.get(entityId);
      controller?.cleanup();
      this.entityControllers.delete(entityId);
    }

    // Load chunks around the player
    if (CONFIG.terrain.infiniteGen) {
      this.world.loadChunksAroundPoint(this.mainPlayer.pos);
    }

    const loadedChunk = this.world.chunks.getNewlyLoadedChunk();
    if (loadedChunk) {
      this.worldRenderer.addChunk(loadedChunk);
    }
  }

  renderLoop(time: number) {
    const delta = time - this.totTime;
    this.worldRenderer.render(this);
    this.pastDeltas.push(delta);
    this.totTime = time;
  }

  onGameAction(actionHolder: GameAction) {
    console.log("Got Game Action", actionHolder);
    if (this.multiPlayer) {
      SocketInterface.send(
        SocketMessage.make(ISocketMessageType.actions, actionHolder.getDto())
      );
    }
  }

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.worldRenderer.shouldRenderMainPlayer =
        this.camera.togglePerspective();
    }
  }
}
