import { PlayerKeyboardController } from "./controllers/playerKeyboardController";
import { Camera } from "./cameras/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game, ISerializedGame } from "../src/game";
import { Entity } from "../src/entities/entity";
import { SocketHandler } from "./socket";
import { canvas } from "./canvas";
import { IDim, IAction, IActionType } from "../types";
import WorldRenderer from "./renders/worldRender";
import { GameSaver } from "./gameSaver";
import { BLOCKS } from "../src/blockdata";
import { ControllerHolder } from "./controllerHolder";
import { Spectator } from "../src/entities/spectator";
import { Cube } from "../src/entities/cube";
import { ISocketMessage, ISocketMessageType } from "../types/socket";
import { clientDb } from "./app";
import { IChunkReader } from "../src/worldModel";

export class ClientGame extends Game {
  controllers: ControllerHolder;
  worldRenderer: WorldRenderer;
  saver: GameSaver;
  spectator: Spectator;
  camera: Camera;
  socket: SocketHandler;
  selectedBlock: BLOCKS = BLOCKS.stone;
  numOfBlocks = 7;
  totTime = 0;
  pastDeltas: number[] = [];

  constructor(chunkReader: IChunkReader, data?: ISerializedGame) {
    super(chunkReader, data);
    this.controllers = new ControllerHolder(this);
    this.worldRenderer = new WorldRenderer(this.world, this);
    this.saver = new GameSaver();

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

    if (this.multiPlayer) {
      this.socket = new SocketHandler(this);
      await this.socket.connect();
    }

    this.setUpPlayer();
    // this.setUpSpectator();

    this.world.load();

    // load the game from server
    // await this.saver.load(this);

    requestAnimationFrame(this.loop.bind(this));
  }

  loop(time: number) {
    const delta = time - this.totTime;

    this.controllers.update(delta);
    this.update(delta);
    this.worldRenderer.render(this);

    this.pastDeltas.push(delta);
    this.totTime = time;

    requestAnimationFrame(this.loop.bind(this));
  }

  // this will be called by the super class when a new entity is added
  onNewEntity(entity: Entity) {
    this.worldRenderer.addEntity(entity);
  }

  onRemoveEntity(uid: string) {
    this.worldRenderer.removeEntity(uid);
  }

  clientActionListener (action: IAction) {
    if (action.blockUpdate) {
      this.worldRenderer.blockUpdate(action.blockUpdate.chunkId)
    }
  }

  // this will be called by the super class when actions are received
  onActions(actions: IAction[]) {
    if (this.multiPlayer && actions.length > 0) {
      this.socket.send({
        type: ISocketMessageType.actions,
        actionPayload: actions.filter(a => !a.isFromServer)
      });
    }
  }

  onClick(e: MouseEvent) {
    const data = this.world.lookingAt(this.camera.pos, this.camera.rotCart.data as IDim);
    if (!data) return;

    const cube = data.entity as Cube;


    if (e.which === 3) { // right click
      // check to see if any entity is in block
      for (const entity of this.entities) {
        if (cube.isPointInsideMe(entity.pos.data as IDim)) {
          return;
        }
      }

      this.actions.push({
        type: IActionType.playerPlaceBlock,
        playerPlaceBlock: {
          blockType: this.selectedBlock,
          blockPos: data.newCubePos.data as IDim,
        }
      });
    } else if (e.which === 1) { // left click
      this.actions.push({
        type: IActionType.removeBlock,
        removeBlock: {
          blockPos: (data.entity as Cube).pos.data as IDim,
        }
      });
    }
  }

  onMouseMove(e: MouseEvent) {
    this.camera.handleMouse(e);
  }

  removeEntityFromGame(uid: string) {
    const entity = this.findEntity(uid);
    this.controllers.remove(entity);
    this.removeEntity(uid);
  }

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.camera.thirdPerson = !this.camera.thirdPerson;
      this.worldRenderer.shouldRenderMainPlayer = !this.worldRenderer.shouldRenderMainPlayer;
    }
  }

  setUpPlayer() {
    const playerController = new PlayerKeyboardController(this.mainPlayer, this);
    this.controllers.add(playerController);
    this.camera = new EntityCamera(this.mainPlayer);
    this.worldRenderer.addEntity(this.mainPlayer);
  }

  setUpSpectator() {
    this.spectator = new Spectator();
    this.addEntity(this.spectator);
    this.camera = new EntityCamera(this.spectator);
    const spectatorController = new PlayerKeyboardController(this.spectator, this);
    this.controllers.add(spectatorController);
    this.worldRenderer.shouldRenderMainPlayer = true;
  }

  toggleCreative() {
    if (this.mainPlayer.creative) {
      this.mainPlayer.setCreative(false);
    } else {
      this.mainPlayer.setCreative(true);
    }
  }

  save() {
    this.saver.saveToServer(this);
    // clientDb.writeGameData(this);
  }

  sendMessageToServer(message: ISocketMessage) {
    this.socket.send(message);
  }
}

