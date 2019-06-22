class Game {
  players: Player[] = [];
  controllers: Controller[] = [];

  mainPlayer = new Player();
  world = new World();
  camera: Camera;
  socket: SocketHandler;

  totTime = 0;
  numOfFrames = 0;
  get frameRate() {
    return this.totTime / this.numOfFrames;
  }

  constructor() {
    this.mainPlayer;
    this.players.push(this.mainPlayer);

    this.load();
  }

  socketOnMessage(message: ISocketMessage) {
    const addPlayer = (uid: string) => {
      const newPlayer = new Player();
      newPlayer.uid = uid;
      const controller = new SocketController(newPlayer);
      this.controllers.push(controller);
      this.players.push(newPlayer);
    };
    if (message.type === "welcome") {
      this.mainPlayer.uid = message.payload.uid;
      (message.payload as WelcomeMessage).players.forEach(addPlayer);
    } else if (message.type === "player-join") {
      addPlayer(message.payload.uid);
    } else if (message.type === "player-leave") {
      const payload = message.payload as NewPlayerMessage;
      const notMe = (id: string) => payload.uid !== id;
      this.players = this.players.filter(p => notMe(p.uid));
      this.controllers = this.controllers.filter(c =>
        notMe((c.entity as Player).uid)
      );
    }
  }

  async load() {
    await canvas.loadProgram();

    this.socket = new SocketHandler(this.socketOnMessage.bind(this));

    this.controllers.push(new KeyboardController(this.mainPlayer));

    this.camera = new EntityCamera(this.mainPlayer);
    // this.camera = new FixedCamera([0, 3, 0], [Math.PI / 2, 0, 0]);

    this.start();
  }

  start() {
    requestAnimationFrame(this.render.bind(this));
  }

  render(time: number) {
    this.totTime = time;
    this.numOfFrames++;

    // updates
    for (const controller of this.controllers) {
      controller.update();
    }

    for (const player of this.players) {
      player.update();
    }

    // move the players out of the blocks
    for (const player of this.players) {
      const collisions = this.world.isCollide(player);
      for (const entity of collisions) {
        player.pushOut(entity);
      }
    }

    // rendering

    // render world first b/c it clears canvas
    this.world.render(this.camera);

    for (const player of this.players) {
      player.render(this.camera);
    }

    requestAnimationFrame(this.render.bind(this));
  }
}

const game = new Game();
