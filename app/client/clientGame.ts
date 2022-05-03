import { Camera } from "../src/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { Entity } from "../src/entities/entity";
import { canvas } from "./canvas";
import { IDim, IAction, IActionType, ISocketMessageType, WorldModel, IWorldData } from "../src/types";
import WorldRenderer from "./renders/worldRender";
import { BLOCKS, ExtraBlockData } from "../src/blockdata";
import { ControllerHolder } from "./controllers/controllerHolder";
import { Spectator } from "../src/entities/spectator";
import { Cube, isPointInsideOfCube } from "../src/entities/cube";
import { GameSocketController } from "./controllers/gameSocketController";
import { getMyUid, IS_MOBILE, SocketInterface } from "./app";
import { Player } from "../src/entities/player";
import { MobileController } from "./controllers/mobileController";
import { GameController } from "./controllers/gameKeyboardController";
import { XrCamera } from "./cameras/xrCamera";
import { Quest2Controller } from "./controllers/quest2Controller";

export class ClientGame extends Game {
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
    worldModel: WorldModel,
    worldData: IWorldData
  ) {
    super(worldModel, worldData);
    this.controllers = new ControllerHolder();
    this.worldRenderer = new WorldRenderer(this.world, this);
    this.mainPlayer = this.entities.createOrGetPlayer(true, getMyUid());

    console.log("My UID", getMyUid());

    if (!this.mainPlayer) throw new Error("Main player was not found");

    const activePlayers = worldData.activePlayers ?? [];
    // draw only the active players
    for (const entity of this.entities.iterable()) {

      // We don't want to be able to control players that we do not own
      if (entity instanceof Player && entity.uid !== getMyUid()) {
        entity.isReal = false;
      }

      // if an entity is a player but not active then don't render them
      if (
        entity instanceof Player &&
        !activePlayers.includes(entity.uid)
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
    await this.world.load();

    const getController = () => {
      if (IS_MOBILE) {
        return new MobileController(this);
      } else if (canvas.isXr) {
        return new Quest2Controller(this);
      } else {
        return new GameController(this);
      }
    }

    const gameController = getController();

    this.controllers.add(gameController);

    console.log("World Loaded");

    if (this.multiPlayer) {
      const socketController = new GameSocketController(this);
      this.controllers.add(socketController);
    }

    this.setUpPlayer();
    // this.setUpSpectator();

    if (canvas.isXr) {
      this.camera = new XrCamera(this.mainPlayer);
    }

    this.camera = new EntityCamera(this.mainPlayer);


    canvas.loop(this.logicLoop.bind(this))
  }

  logicLoop(time: number) {
    const delta = time - this.totTime;

    this.controllers.update(delta);
    this.update(delta);
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

  clientActionListener(action: IAction) {
    if (action.blockUpdate) {
      this.worldRenderer.blockUpdate(action.blockUpdate.chunkId)
    }
  }

  // this will be called by the super class when actions are received
  onActions(actions: IAction[]) {
    if (this.multiPlayer && actions.length > 0) {
      SocketInterface.send({
        type: ISocketMessageType.actions,
        // filter out actions that we received from the server
        actionPayload: actions.filter(a => !a.isFromServer)
      });
    }
  }

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
      playerPlaceBlock: {
        blockType: this.selectedBlock,
        blockPos: data.newCubePos.data as IDim,
        blockData: extraBlockData,
      }
    });
  }

  removeBlock() {
    const data = this.world.lookingAt(this.camera);
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

