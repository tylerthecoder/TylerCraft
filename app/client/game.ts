import { Player } from "../src/entities/player";
import { Controller, Controlled } from "./controllers/controller";
import { PlayerSocketController } from "./controllers/playerSocketController";
import { canvas } from "./canvas";
import { PlayerKeyboardController } from "./controllers/playerKeyboardController";
import { Camera } from "./cameras/camera";
import { EntityCamera } from "./cameras/entityCamera";
import { Game } from "../src/game";
import { RenderType, Entity } from "../src/entities/entity";
import { CubeRenderer } from "./renders/cubeRender";
import { SphereRenderer } from "./renders/sphereRender";
import { ChunkRenderer } from "./renders/chunkRender";
import { Renderer } from "./renders/renderer";
import { GameController } from "./controllers/gameController";
import { FixedCamera } from "./cameras/fixedCamera";
import { SpectatorController } from "./controllers/spectator";
import { SocketHandler } from "./socket";
import {
  ISocketMessage,
  WelcomeMessage,
  NewPlayerMessage
} from "../types/socket";
import { IDim } from "../types";

export class ClientGame {
  game: Game;

  controllers: Controller[] = [];
  renderers: Renderer[] = [];

  mainPlayer: Player;

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

  socketOnMessage(message: ISocketMessage) {
    console.log(message);
    if (message.type === "welcome") {
      this.serverWelcome(message.payload as WelcomeMessage);
    } else if (message.type === "player-join") {
      this.addOtherPlayer(message.payload.uid);
    } else if (message.type === "player-leave") {
      const payload = message.payload as NewPlayerMessage;
      const notMe = (id: string) => payload.uid !== id;
      this.game.entities = this.game.entities.filter(p => notMe(p.uid));
      this.controllers = this.controllers.filter(c =>
        notMe((c.controlled as Player).uid)
      );
    }
  }

  serverWelcome(msg: WelcomeMessage) {
    this.mainPlayer.setUid(msg.uid);
    msg.players.forEach(this.addOtherPlayer.bind(this));
    // get generated world here as well
  }

  addOtherPlayer(uid: string) {
    const newPlayer = this.game.addPlayer(uid);
    const controller = new PlayerSocketController(newPlayer);
    this.controllers.push(controller);
  }

  async load() {
    await canvas.loadProgram();

    this.game.onNewEntity(this.onNewEntity.bind(this));

    this.mainPlayer = this.game.addPlayer();
    this.setUpPlayer();

    this.socket = new SocketHandler(this.socketOnMessage.bind(this));

    const gameController = new GameController(this);
    this.controllers.push(gameController);

    this.game.world.chunks.forEach(chunk => {
      const renderer = new ChunkRenderer(chunk);
      this.renderers.push(renderer);
    });

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
  }

  addEntity(entity: Entity) {
    this.game.addEntity(entity);
  }

  removeEntity(uid: string) {}

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
    const playerController = new PlayerKeyboardController(this.mainPlayer);
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

const game = new ClientGame();

// for debugging
(window as any).game = game;
