import { Player } from "../src/entities/player";
import { Controller, Controlled } from "./controllers/controller";
import { canvas } from "./canvas";
import { PlayerKeyboardController } from "./controllers/playerKeyboardController";
import { Camera } from "./cameras/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { RenderType, Entity } from "../src/entities/entity";
import { CubeRenderer } from "./renders/cubeRender";
import { SphereRenderer } from "./renders/sphereRender";
import { HudRenderer } from "./renders/hudRender";
import { ChunkRenderer } from "./renders/chunkRender";
import { Renderer } from "./renders/renderer";
import { GameController } from "./controllers/gameController";
import { FixedCamera } from "./cameras/fixedCamera";
import { SpectatorController } from "./controllers/spectator";
import { SocketHandler } from "./socket";
import { IDim, IAction } from "../types";
import { Cube } from "../src/entities/cube";

type MetaActions = "forward" | "backward" | "left" | "right" | "jump";


// const PLAYER_CONTROLLER = SpectatorController;
const PLAYER_CONTROLLER = PlayerKeyboardController;


export class ClientGame {
  game: Game;

  controllers: Controller[] = [];
  renderers: Renderer[] = [];

  metaActions: MetaActions[];

  mainPlayer: Player;
  multiPlayer = false;

  camera: Camera;
  socket: SocketHandler;

  renderPlayer = false;

  totTime = 0;
  pastDeltas: number[] = [];
  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-20);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur);
    return totTime / Math.min(this.pastDeltas.length, 20);
  }

  constructor() {
    this.game = new Game();
    this.load();
  }

  loadHandlers() {
    window.addEventListener("mousedown", () => {
      if (document.pointerLockElement !== canvas.canvas) {
        canvas.canvas.requestPointerLock();
        return;
      }
      this.onClick();
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

    this.game.onNewEntity(this.onNewEntity.bind(this));

    this.mainPlayer = this.game.addPlayer(true);
    this.setUpPlayer();

    const gameController = new GameController(this);
    this.controllers.push(gameController);

    this.game.world.chunks.forEach(chunk => {
      const renderer = new ChunkRenderer(chunk);
      this.renderers.push(renderer);
    });

    const hudCanvas = new HudRenderer();
    hudCanvas.canvas = canvas;

    this.renderers.push(hudCanvas);

    this.game.actionListener = (actions: IAction[]) => {
        // send actions to server

      if (this.multiPlayer) {
        this.socket.send({
          type: "actions",
          actionPayload: actions
        });
      }

      for (const action of actions) {
        if (action.blockUpdate) {
          this.renderers.forEach(renderer => {
            if ((renderer as ChunkRenderer).chunk === action.blockUpdate) {
              (renderer as ChunkRenderer).getBufferData();
            }
          });
        }
      };
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  loop(time: number) {
    const delta = time - this.totTime;

    for (const controller of this.controllers) {
      controller.update(delta);
    }

    this.game.update(delta);

    this.render();

    this.pastDeltas.push(delta);
    this.totTime = time;

    requestAnimationFrame(this.loop.bind(this));
  }

  render() {
    canvas.clearCanvas();

    for (const renderer of this.renderers) {
      if (
        !this.renderPlayer &&
        (renderer as CubeRenderer).entity === this.mainPlayer
      ) {
        continue;
      }
      renderer.render(this.camera);
    }
  }

  // when there is a new entity add it to the render list
  onNewEntity(entity: Entity) {
    if (entity.renderType === RenderType.CUBE) {
      const renderer = new CubeRenderer(entity);
      this.renderers.push(renderer);
    } else if (entity.renderType === RenderType.SPHERE) {
      const renderer = new SphereRenderer(entity);
      this.renderers.push(renderer);
    }

    if (this.multiPlayer) {
      this.socket.sendEntity(entity);
    }
  }

  onEntityClick(entity: Entity) {
    this.game.handleAction({
      playerClick: entity,
    });
  }

  onClick() {
    // const clickedEntity = this.camera.onClick(this.game.world.cubes);
    const cube = this.game.world.lookingAt(this.camera);
    if (cube) {
      this.onEntityClick(cube);
    }
  }

  onMouseMove(e: MouseEvent) {
    this.camera.handleMouse(e);
  }

  removeEntity(uid: string) {
    const entity = this.game.findEntity(uid);
    this.deleteController(entity);
    this.game.removeEntity(entity);
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
      this.renderPlayer = !this.renderPlayer;
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
      this.renderPlayer = true;
      this.deleteController(this.mainPlayer);
      this.setUpSpectator();
    } else {
      // spectate was previously on
      this.renderPlayer = false;
      this.deleteController(this.camera);
      this.setUpPlayer();
    }
  }
}

export const game = new ClientGame();

// for debugging
(window as any).game = game;
