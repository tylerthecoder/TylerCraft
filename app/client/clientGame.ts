import { Camera } from "../src/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { Entity } from "../src/entities/entity";
import { canvas } from "./canvas";
import { IDim, ISocketMessageType, WorldModel, IWorldData } from "../src/types";
import WorldRenderer from "./renders/worldRender";
import { BLOCKS, ExtraBlockData } from "../src/blockdata";
import { ControllerHolder } from "./controllers/controllerHolder";
import { Spectator } from "../src/entities/spectator";
import { Cube, isPointInsideOfCube } from "../src/entities/cube";
import { SocketGameHandler } from "./controllers/gameSocketController";
import { getMyUid, SocketInterface } from "./app";
import { Player } from "../src/entities/player";
import { XrCamera } from "./cameras/xrCamera";
import { AbstractScript } from "@tylercraft/src/scripts/AbstractScript"
import { GameAction } from "@tylercraft/src/gameActions";
import { GameStateDiff } from "@tylercraft/src/gameStateDiff";


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
    super();

    this.controllers = new ControllerHolder();

    this.worldRenderer = new WorldRenderer(this.game.world, this);
    this.mainPlayer = this.game.entities.createOrGetPlayer(true, getMyUid());

    console.log("My UID", getMyUid());

    this.load();
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

    // Update the controllers so they can append game actions
    this.controllers.update(delta);

    for (const dirtyChunkId of stateDiff.getDirtyChunks()) {
      this.worldRenderer.blockUpdate(dirtyChunkId);
    }
  }

  renderLoop(time: number) {
    const delta = time - this.totTime;
    this.worldRenderer.render(this);
    this.pastDeltas.push(delta);
    this.totTime = time;
  }

  // this will be called by the super class when a new entity is added
  onNewEntity(entity: Entity) {
    this.worldRenderer.addEntity(entity);
  }

  onRemoveEntity(uid: string) {
    this.worldRenderer.removeEntity(uid);
  }

  // this will be called by the super class when actions are received
  // Don't need to filter actions because they all originate from this class
  onActions(actions: GameAction[]) {
    if (this.game.multiPlayer && actions.length > 0) {
      SocketInterface.send({
        type: ISocketMessageType.actions,
        actionPayload: actions
      });
    }
  }

  // TODO move this to the Game class
  placeBlock() {
    const data = this.world.lookingAt(this.camera);
    if (!data) return;
    const cube = data.entity as Cube;

    // check to see if any entity is in block
    for (const entity of this.entities.iterable()) {
      if (isPointInsideOfCube(cube, entity.pos)) {
        return;
      }
    }

    let extraBlockData: ExtraBlockData | undefined = undefined;

    if (this.selectedBlock === BLOCKS.image) {
      extraBlockData = {
        galleryIndex: 0,
        face: data.face,
      }
    }

    this.actions.push({
      type: IActionType.playerPlaceBlock,
      payload: {
        blockType: this.selectedBlock,
        blockPos: data.newCubePos.data as IDim,
        blockData: extraBlockData,
      }
    });
  }

  // TODO move this to the Game class
  removeBlock() {
    const data = this.world.lookingAt(this.camera);
    if (!data) return;
    const cube = data.entity as Cube;

    this.actions.push({
      type: IActionType.removeBlock,
      payload: {
        blockPos: cube.pos.data as IDim,
      }
    });
  }

  removeEntityFromGame(uid: string) {
    const entity = this.entities.get(uid)!;
    this.controllers.remove(entity);
    this.removeEntity(uid);
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
    this.isSpectating = true;
    this.spectator = new Spectator();
    // this.entities.add(this.spectator);
    this.camera = new EntityCamera(this.spectator);
    this.worldRenderer.shouldRenderMainPlayer = true;
  }

  toggleCreative() {
    if (this.mainPlayer.creative) {
      this.mainPlayer.setCreative(false);
    } else {
      this.mainPlayer.setCreative(true);
    }
  }
}

