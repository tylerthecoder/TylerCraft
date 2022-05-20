import { Camera } from "../src/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { canvas } from "./canvas";
import { ISocketMessage, ISocketMessageType, IWorldData, WorldModel } from "../src/types";
import WorldRenderer from "./renders/worldRender";
import { Spectator } from "../src/entities/spectator";
import { getMyUid, IExtendedWindow, IS_MOBILE, SocketInterface } from "./app";
import { Player } from "../src/entities/player";
import { XrCamera } from "./cameras/xrCamera";
import { GameStateDiff } from "@tylercraft/src/gameStateDiff";
import { GameActionHolder } from "@tylercraft/src/gameActions";
import { GameController } from "@tylercraft/src/controllers/controller";


// This class should only read game and not write.
// It uses game data to draw the game to the screen and handle user input
export class ClientGame extends Game {
  controller: GameController;
  worldRenderer: WorldRenderer;
  spectator: Spectator;
  isSpectating = false;
  camera: Camera;
  // selectedBlock: BLOCKS = BLOCKS.stone;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];
  mainPlayer: Player;

  constructor(
    controller: (game: ClientGame) => GameController,
    worldModel: WorldModel,
    worldData: IWorldData,
  ) {
    super(controller, worldModel, worldData);

    (window as IExtendedWindow).clientGame = this;

    console.log("ClientGame created", this);

    this.worldRenderer = new WorldRenderer(this.world, this);

    // Temp
    this.worldRenderer.shouldRenderMainPlayer = false;

    this.mainPlayer = this.entities.createOrGetPlayer(getMyUid());

    console.log("My UID", getMyUid());

    // Create renderers for initial entities
    for (const entity of this.entities.iterable()) {
      this.worldRenderer.addEntity(entity);
    }
  }

  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-100);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur, 0);
    const averageMs = totTime / Math.min(this.pastDeltas.length, 100);
    const fps = 1 / (averageMs / 1000);
    return fps;
  }

  async load() {
    await canvas.loadProgram();

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

  setUpSpectator() {
    // this.isSpectating = true;
    // this.spectator = new Spectator();
    // this.entities.add(this.spectator);
    // this.camera = new EntityCamera(this.spectator);
    // this.worldRenderer.shouldRenderMainPlayer = true;
  }

  toggleCreative() {
    if (this.mainPlayer.creative) {
      this.mainPlayer.setCreative(false);
    } else {
      this.mainPlayer.setCreative(true);
    }
  }
}

