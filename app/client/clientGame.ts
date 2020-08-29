import { Player } from "../src/entities/player";
import { Controller, Controlled } from "./controllers/controller";
import { PlayerKeyboardController } from "./controllers/playerKeyboardController";
import { Camera } from "./cameras/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { RenderType, Entity } from "../src/entities/entity";
import { GameController } from "./controllers/gameController";
import { FixedCamera } from "./cameras/fixedCamera";
import { SocketHandler } from "./socket";
import { canvas } from "./canvas";
import { IDim, IAction, IActionType } from "../types";
import WorldRenderer from "./renders/worldRender";
import { GameSaver } from "./gameSaver";
import { BLOCKS } from "../src/blockdata";
import { ControllerHolder } from "./controllerHolder";


const PLAYER_CONTROLLER = PlayerKeyboardController;


export class ClientGame extends Game {
  controllers = new ControllerHolder(this);
  worldRenderer: WorldRenderer;

  saver = new GameSaver();

  mainPlayer: Player;
  multiPlayer = true;

  camera: Camera;
  socket: SocketHandler;

  selectedBlock: BLOCKS = BLOCKS.stone;

  totTime = 0;
  pastDeltas: number[] = [];
  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-20);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur);
    return totTime / Math.min(this.pastDeltas.length, 20);
  }

  constructor() {
    super();
    this.load();
  }

  loadHandlers() {
    window.addEventListener("mousedown", (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas.canvas) {
        canvas.canvas.requestPointerLock();
        return;
      }
      this.onClick(e);
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === canvas.canvas) {
        this.onMouseMove(e);
      }
    });
  }

  async load() {
    await canvas.loadProgram();

    this.loadHandlers();

    if (this.multiPlayer) {
      this.socket = new SocketHandler(this);
      await this.socket.connect();
    }

    this.worldRenderer = new WorldRenderer(this.world, this);

    this.mainPlayer = this.addPlayer(true);
    this.setUpPlayer();

    // load the game from server
    await this.saver.load(this);

    this.clientActionListener = (action: IAction) => {
      if (action.blockUpdate) {
        this.worldRenderer.blockUpdate(action.blockUpdate.chunkId)
      }
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  private loopCount = 0;
  loop(time: number) {
    const delta = time - this.totTime;

    // send player data every hundred loops
    this.loopCount++;
    if (this.loopCount > 100) {


    }

    this.controllers.update(delta);
    this.update(delta);
    this.render();

    this.pastDeltas.push(delta);
    this.totTime = time;

    requestAnimationFrame(this.loop.bind(this));
  }

  render() {
    this.worldRenderer.render(this);
  }

  // this will be called by the super class when a new entity is added
  onNewEntity(entity: Entity) {
    this.worldRenderer.addEntity(entity);
  }

  // this will be called by the super class when actions are recieved
  onActions(actions: IAction[]) {
    if (this.multiPlayer && actions.length > 0) {
      this.socket.send({
        type: "actions",
        actionPayload: actions.filter(a => !a.isFromServer)
      });
    }
  }

  onClick(e: MouseEvent) {
    const data = this.world.lookingAt(this.camera.pos, this.camera.rotUnitVector);
    if (e.which === 1) { // left click
      this.actions.push({
        type: IActionType.playerPlaceBlock,
        playerPlaceBlock: {
          blockType: this.selectedBlock,
          entity: data.entity,
          newCubePos: data.newCubePos.data as IDim,
        }
      });
    } else if (e.which === 3) { // right click
      this.actions.push({
        type: IActionType.playerRemoveBlock,
        playerRemoveBlock: {
          entity: data.entity,
          newCubePos: data.newCubePos.data as IDim,
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
    this.removeEntity(entity);
  }

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.camera.thirdPerson = !this.camera.thirdPerson;
      this.worldRenderer.shouldRenderMainPlayer = !this.worldRenderer.shouldRenderMainPlayer;
    }
  }

  setUpPlayer() {
    const playerController = new PLAYER_CONTROLLER(this.mainPlayer, this);
    this.controllers.add(playerController);
    this.camera = new EntityCamera(this.mainPlayer);
  }

  setUpSpectator() {
    this.camera = new FixedCamera(
      this.mainPlayer.pos.slice(0) as IDim,
      this.camera.rot.slice(0) as IDim
    );
    this.mainPlayer.spectator = true;
  }

  toggleSpectate() {
    if (this.camera instanceof EntityCamera) {
      // spectate was previously off
      this.worldRenderer.shouldRenderMainPlayer = true;
      this.controllers.remove(this.mainPlayer);
      this.setUpSpectator();
    } else {
      // spectate was previously on
      this.worldRenderer.shouldRenderMainPlayer = false;
      this.controllers.remove(this.camera);
      this.setUpPlayer();
    }
  }

  save() {
    this.saver.saveToServer(this);
  }
}

export const game = new ClientGame();

// for debugging
(window as any).game = game;
