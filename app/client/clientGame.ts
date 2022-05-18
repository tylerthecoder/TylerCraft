import { Camera } from "../src/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { canvas } from "./canvas";
import { ISocketMessageType } from "../src/types";
import WorldRenderer from "./renders/worldRender";
import { BLOCKS } from "../src/blockdata";
import { ControllerHolder } from "./controllers/controllerHolder";
import { Spectator } from "../src/entities/spectator";
import { SocketGameHandler } from "./controllers/gameSocketController";
import { getMyUid, IExtendedWindow, SocketInterface } from "./app";
import { Player } from "../src/entities/player";
import { XrCamera } from "./cameras/xrCamera";
import { AbstractScript } from "@tylercraft/src/scripts/AbstractScript"
import { GameStateDiff } from "@tylercraft/src/gameStateDiff";
import { GameAction, GameActionHolder } from "@tylercraft/src/gameActions";


// This class should only read game and not write.
// It uses game data to draw the game to the screen and handle user input
export class ClientGame extends AbstractScript {
  controllers: ControllerHolder;
  worldRenderer: WorldRenderer;
  spectator: Spectator;
  isSpectating = false;
  camera: Camera;
  selectedBlock: BLOCKS = BLOCKS.stone;
  numOfBlocks = 10;
  totTime = 0;
  pastDeltas: number[] = [];
  mainPlayer: Player;

  constructor(
    public game: Game,
  ) {
    super(game);

    (window as IExtendedWindow).clientGame = this;

    console.log("ClientGame created", this);

    this.controllers = new ControllerHolder();

    this.worldRenderer = new WorldRenderer(this.game.world, this);

    // Temp
    this.worldRenderer.shouldRenderMainPlayer = false;

    this.mainPlayer = this.game.entities.createOrGetPlayer(getMyUid());

    console.log("My UID", getMyUid());

    // Create renderers for initial entities
    for (const entity of this.game.entities.iterable()) {
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

  async init() {
    await canvas.loadProgram();
    this.controllers.init(this);

    if (this.game.multiPlayer) {
      const socketController = new SocketGameHandler(this);
      this.controllers.add(socketController);
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


  // Called by Game each tick,
  update(delta: number, stateDiff: GameStateDiff) {

    for (const dirtyChunkId of stateDiff.getDirtyChunks()) {
      this.worldRenderer.blockUpdate(dirtyChunkId);
    }

    for (const entityId of stateDiff.getNewEntities()) {
      const entity = this.game.entities.get(entityId);
      this.worldRenderer.addEntity(entity);
    }

    for (const entityId of stateDiff.getRemovedEntities()) {
      this.worldRenderer.removeEntity(entityId);
    }
  }

  renderLoop(time: number) {
    const delta = time - this.totTime;
    // Update the controllers so they can append game actions
    this.controllers.update(delta);
    this.worldRenderer.render(this);
    this.pastDeltas.push(delta);
    this.totTime = time;
  }

  // this will be called by the super class when actions are received
  // Don't need to filter actions because they all originate from this class
  onAction(actionHolder: GameActionHolder) {
    // Don't send rotate actions just yet
    if (actionHolder.isType(GameAction.PlayerRotate)) {
      return;
    }


    if (this.game.multiPlayer) {
      SocketInterface.send({
        type: ISocketMessageType.actions,
        actionPayload: actionHolder.getDto(),
      });
    }
  }

  placeBlock() {
    this.game.handleAction(GameAction.PlaceBlock, {
      blockType: this.selectedBlock,
      cameraData: this.camera.getCameraData(),
    });
  }

  removeBlock() {
    this.game.handleAction(GameAction.RemoveBlock, {
      cameraData: this.camera.getCameraData(),
      playerUid: this.mainPlayer.uid,
    })
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

