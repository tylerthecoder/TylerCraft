import { Player } from "../src/entities/player";
import { Controller, Controlled } from "./controllers/controller";
import { PlayerKeyboardController } from "./controllers/playerKeyboardController";
import { Camera } from "./cameras/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { RenderType, Entity } from "../src/entities/entity";
import { GameController } from "./controllers/gameController";
import { FixedCamera } from "./cameras/fixedCamera";
import { SpectatorController } from "./controllers/spectator";
import { SocketHandler } from "./socket";
import { canvas } from "./canvas";
import { IDim, IAction } from "../types";
import WorldRenderer from "./renders/worldRender";

type MetaActions = "forward" | "backward" | "left" | "right" | "jump";


const PLAYER_CONTROLLER = SpectatorController;
// const PLAYER_CONTROLLER = PlayerKeyboardController;


export class ClientGame extends Game {
  controllers: Controller[] = [];
  worldRenderer: WorldRenderer;

  mainPlayer: Player;
  multiPlayer = false;

  camera: Camera;
  socket: SocketHandler;

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

    this.worldRenderer = new WorldRenderer(this.world);

    this.onNewEntity(this.onNewEntity.bind(this));

    this.mainPlayer = this.addPlayer(true);
    this.setUpPlayer();

    const gameController = new GameController(this);
    this.controllers.push(gameController);



    // move these to abstract functions
    this.actionListener = (actions: IAction[]) => {
      // send actions to server
      if (this.multiPlayer && actions.length > 0) {
        this.socket.send({
          type: "actions",
          actionPayload: actions.filter(a => !a.isFromServer)
        });
      }
    }

    this.clientActionListener = (action: IAction) => {
      if (action.blockUpdate) {
        this.worldRenderer.blockUpdate(action.blockUpdate.chunkId)
      }
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  loop(time: number) {
    const delta = time - this.totTime;

    for (const controller of this.controllers) {
      controller.update(delta);
    }

    this.update(delta);


    // do something fun to blocks
    // for (const chunk of this.game.world.chunks) {
    //   chunk[1].cubes.forEach((cube) => {
    //     if (cube.update(0)) {
    //   this.game.actions.push({
    //     blockUpdate: chunk[1],
    //   });
    //     }
    //   })
    // }

    this.render();

    this.pastDeltas.push(delta);
    this.totTime = time;

    requestAnimationFrame(this.loop.bind(this));
  }

  render() {
    this.worldRenderer.render(this);
  }

  // when there is a new entity add it to the render list
  renderEntity(entity: Entity) {
    this.worldRenderer.addEntity(entity);

    // if (this.multiPlayer) {
    //   this.socket.sendEntity(entity);
    // }
  }

  onClick(e: MouseEvent) {
    // const clickedEntity = this.camera.onClick(this.game.world.cubes);
    const data = this.world.lookingAt(this.camera.pos, this.camera.rotUnitVector);
    if (e.which === 1) { // left click
      this.actions.push({
        playerLeftClick: data
      });
    } else if (e.which === 3) { // right click
      this.actions.push({
        playerRightClick: data
      });
    }
  }

  onMouseMove(e: MouseEvent) {
    this.camera.handleMouse(e);
  }

  removeEntityFromGame(uid: string) {
    const entity = this.findEntity(uid);
    this.deleteController(entity);
    this.removeEntity(entity);
  }

  addController(controller: Controller) {
    this.controllers.push(controller);
  }

  deleteController(controlled: Controlled) {
    this.controllers = this.controllers.filter(controller => {
      return controller.controlled !== controlled;
    });
  }

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.camera.thirdPerson = !this.camera.thirdPerson;
      this.worldRenderer.shouldRenderMainPlayer = !this.worldRenderer.shouldRenderMainPlayer;
    }
  }

  setUpPlayer() {
    const playerController = new PLAYER_CONTROLLER(this.mainPlayer);
    this.controllers.push(playerController);
    this.camera = new EntityCamera(this.mainPlayer);
  }

  setUpSpectator() {
    this.camera = new FixedCamera(
      this.mainPlayer.pos.slice(0) as IDim,
      this.camera.rot.slice(0) as IDim
    );
    this.controllers.push(new SpectatorController(this.camera));
  }

  toggleSpectate() {
    if (this.camera instanceof EntityCamera) {
      // spectate was previously off
      this.worldRenderer.shouldRenderMainPlayer = true;
      this.deleteController(this.mainPlayer);
      this.setUpSpectator();
    } else {
      // spectate was previously on
      this.worldRenderer.shouldRenderMainPlayer = false;
      this.deleteController(this.camera);
      this.setUpPlayer();
    }
  }
}

export const game = new ClientGame();

// for debugging
(window as any).game = game;
