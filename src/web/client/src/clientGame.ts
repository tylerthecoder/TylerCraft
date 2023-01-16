import { Camera, Game, ISocketMessage, ISocketMessageType, IWorldData, WorldModel, Player, GameStateDiff, GameAction, GameActionHolder, GameController, World, EntityHolder } from "@craft/engine";
import { EntityCamera } from "./cameras/entityCamera";
import { canvas } from "./canvas";
import WorldRenderer from "./renders/worldRender";
import { getMyUid, IExtendedWindow, IS_MOBILE, SocketInterface } from "./app";
import { XrCamera } from "./cameras/xrCamera";
import { MobileController } from "./controllers/mobileController";
import { Quest2Controller } from "./controllers/quest2Controller";
import { MouseAndKeyController } from "./controllers/gameKeyboardController";


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
  controller: GameController<GameAction>;

  static async make(
    worldData: IWorldData,
    worldModel: WorldModel,
  ): Promise<ClientGame> {

    const entityHolder = new EntityHolder(worldData.data?.entities);
    const world = await World.make(
      worldData.chunkReader,
      worldData.data?.world,
    )

    const game = new ClientGame(entityHolder, world, worldModel, worldData);

    return game;
  }

  private constructor(
    entities: EntityHolder,
    world: World,
    worldModel: WorldModel,
    worldData: IWorldData,
  ) {
    super(entities, world, worldModel, worldData);

    (window as IExtendedWindow).clientGame = this;

    console.log("ClientGame created", this);

    this.controller = this.makeController();

    this.worldRenderer = new WorldRenderer(this.world, this);

    // Temp
    this.worldRenderer.shouldRenderMainPlayer = false;

    this.mainPlayer = entities.createOrGetPlayer(this.stateDiff, getMyUid());

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

    this.setUpPlayer();
    // this.setUpSpectator();

    if (canvas.isXr) {
      this.camera = new XrCamera(this.mainPlayer);
    } else {
      this.camera = new EntityCamera(this.mainPlayer);
    }

    canvas.loop(this.renderLoop.bind(this))
  }

  private makeController(): GameController<GameAction> {
    const getClass = () => {
      if (IS_MOBILE) {
        return MobileController;
      } else if (canvas.isXr) {
        return Quest2Controller;
      } else {
        return MouseAndKeyController;
      }
    }
    return new (getClass())(this);
  }

  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-100);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur, 0);
    const averageMs = totTime / Math.min(this.pastDeltas.length, 100);
    const fps = 1 / (averageMs / 1000);
    return fps;
  }

  onSocketMessage(message: ISocketMessage) {
    console.log("Socket Message", message);
    if (message.type === ISocketMessageType.gameDiff) {
      this.handleStateDiff(message.gameDiffPayload!);
    }
  }

  // Called by Game each tick,
  update(delta: number, stateDiff: GameStateDiff) {

    for (const dirtyChunkId of stateDiff.getDirtyChunks()) {
      this.worldRenderer.blockUpdate(dirtyChunkId);
    }

    for (const entityId of stateDiff.getNewEntities()) {
      const entity = this.entities.get(entityId);
      this.worldRenderer.addEntity(entity);
    }

    for (const entityId of stateDiff.getRemovedEntities()) {
      this.worldRenderer.removeEntity(entityId);
    }
  }

  renderLoop(time: number) {
    const delta = time - this.totTime;
    // Update the controllers so they can append game actions
    this.worldRenderer.render(this);
    this.pastDeltas.push(delta);
    this.totTime = time;
  }

  onAction(actionHolder: GameActionHolder) {
    if (this.multiPlayer) {
      SocketInterface.send({
        type: ISocketMessageType.actions,
        actionPayload: actionHolder.getDto(),
      });
    }
  }

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.worldRenderer.shouldRenderMainPlayer = this.camera.togglePerspective();
    }
  }

  setUpPlayer() {
    this.isSpectating = false;
    this.camera = new EntityCamera(this.mainPlayer);
    this.worldRenderer.addEntity(this.mainPlayer);
  }

  toggleCreative() {
    if (this.mainPlayer.creative) {
      this.mainPlayer.setCreative(false);
    } else {
      this.mainPlayer.setCreative(true);
    }
  }
}

