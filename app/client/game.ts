import { Player } from "../src/entities/player";
import { Controller } from "./controllers/controller";
import { PlayerSocketController } from "./controllers/playerSocketController";
import { canvas } from "./canvas";
import { PlayerKeyboardController } from "./controllers/playerKeyboardController";
import { Camera } from "./cameras/camera";
import { EntityCamera } from "./cameras/entityCamera";
import {
  SocketHandler,
  WelcomeMessage,
  NewPlayerMessage,
  ISocketMessage
} from "./socket";
import { Game } from "../src/game";
import { RenderType, Entity } from "../src/entities/entity";
import { CubeRenderer } from "./renders/cubeRender";
import { SphereRenderer } from "./renders/sphereRender";
import { ChunkRenderer } from "./renders/chunkRender";
import { Renderer } from "./renders/renderer";
import { GameController } from "./controllers/gameController";
import { FixedCamera } from "./cameras/fixedCamera";
import { SpectatorController } from "./controllers/spectator";

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
    this.mainPlayer.uid = msg.uid;
    msg.players.forEach(this.addOtherPlayer.bind(this));
    // get generated world here as well
  }

  addOtherPlayer(uid: string) {
    const newPlayer = new Player(this.game);
    newPlayer.setUid(uid);
    const controller = new PlayerSocketController(newPlayer);
    this.controllers.push(controller);
    this.addEntity(newPlayer);
  }

  async load() {
    await canvas.loadProgram();

    this.game.onNewEntity(this.onNewEntity.bind(this));

    this.mainPlayer = new Player(this.game);
    this.addEntity(this.mainPlayer);

    this.socket = new SocketHandler(this.socketOnMessage.bind(this));

    const playerController = new PlayerKeyboardController(this.mainPlayer);
    this.controllers.push(playerController);

    const gameController = new GameController(this);
    this.controllers.push(gameController);

    this.camera = new EntityCamera(this.mainPlayer);

    this.game.world.chunks.forEach(chunk => {
      const renderer = new ChunkRenderer(chunk);
      this.renderers.push(renderer);
    });

    // this.camera = new FixedCamera([0, 3, 0], [Math.PI / 2, 0, 0]);
    // this.controllers.push(new SpectatorController(this.camera));

    this.start();
  }

  start() {
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

  toggleThirdPerson() {
    if (this.camera instanceof EntityCamera) {
      this.camera.thirdPerson = !this.camera.thirdPerson;
      this.renderPlayer = !this.renderPlayer;
    }
  }

  toggleSpectate() {
    if (this.camera instanceof EntityCamera) {
      this.camera = new FixedCamera(this.mainPlayer.pos, this.camera.rot);
      this.controllers.push(new SpectatorController(this.camera));
    }
  }
}

const game = new ClientGame();

// for debugging
(window as any).game = game;
