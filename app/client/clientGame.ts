import { Camera } from "./cameras/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game, ISerializedGame } from "../src/game";
import { Entity } from "../src/entities/entity";
import { canvas } from "./canvas";
import { IDim, IAction, IActionType } from "../types";
import WorldRenderer from "./renders/worldRender";
import { BLOCKS } from "../src/blockdata";
import { ControllerHolder } from "./controllers/controllerHolder";
import { Spectator } from "../src/entities/spectator";
import { Cube } from "../src/entities/cube";
import { ISocketMessageType } from "../types/socket";
import { IChunkReader, WorldModel } from "../src/worldModel";
import { GameSocketController } from "./controllers/gameSocketController";
import { getMyUid, IS_MOBILE, SocketInterface } from "./app";
import { Player } from "../src/entities/player";
import { MobileController } from "./controllers/mobileController";
import { GameController } from "./controllers/gameKeyboardController";

export class ClientGame extends Game {
  controllers: ControllerHolder;
  worldRenderer: WorldRenderer;
  spectator: Spectator;
  isSpectating = false;
  camera: Camera;
  selectedBlock: BLOCKS = BLOCKS.stone;
  numOfBlocks = 7;
  totTime = 0;
  pastDeltas: number[] = [];
  mainPlayer: Player;

  constructor(
    worldModel: WorldModel,
    chunkReader: IChunkReader,
    opts: {
      data?: ISerializedGame,
      multiplayer: boolean,
      activePlayers: string[],
    }
  ) {
    super(worldModel, chunkReader, opts)
    this.controllers = new ControllerHolder();
    this.worldRenderer = new WorldRenderer(this.world, this);
    this.mainPlayer = this.entities.createOrGetPlayer(true, getMyUid());

    const gameController = IS_MOBILE ? new MobileController(this) : new GameController(this, canvas);
    this.controllers.add(gameController);

    if (!this.mainPlayer) throw new Error("Main player was not found");

    // draw only the active players
    for (const entity of this.entities.iterable()) {
      // if an entity is a player but not active then don't render them
      if (
        entity instanceof Player &&
        !opts.activePlayers.includes(entity.uid)
      ) continue;
      if (entity.uid === getMyUid()) continue; // don't render the main player
      this.onNewEntity(entity);
    }

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
      const socketController = new GameSocketController(this);
      this.controllers.add(socketController);
    }

    this.setUpPlayer();
    // this.setUpSpectator();

    this.world.load();

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
      SocketInterface.send({
        type: ISocketMessageType.actions,
        actionPayload: actions.filter(a => !a.isFromServer)
      });
    }
  }

  placeBlock() {
    const data = this.world.lookingAt(this.camera.pos, this.camera.rotCart.data as IDim);
    if (!data) return;
    const cube = data.entity as Cube;

    // check to see if any entity is in block
    for (const entity of this.entities.iterable()) {
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
  }

  removeBlock() {
    const data = this.world.lookingAt(this.camera.pos, this.camera.rotCart.data as IDim);
    if (!data) return;
    const cube = data.entity as Cube;

    this.actions.push({
      type: IActionType.removeBlock,
      removeBlock: {
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
      this.camera.thirdPerson = !this.camera.thirdPerson;
      this.worldRenderer.shouldRenderMainPlayer = !this.worldRenderer.shouldRenderMainPlayer;
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
    this.entities.add(this.spectator);
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

