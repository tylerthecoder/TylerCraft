class World {
  canvas: CanvasProgram;

  cubes: Cube[];
  players: Player[] = [];
  controllers: Controller[] = [];

  mainPlayer: Player;
  camera: Camera;
  socket: SocketHandler;

  lastTime = 0;

  constructor() {
    this.canvas = new CanvasProgram();

    this.mainPlayer = new Player(this.canvas);
    this.players.push(this.mainPlayer);

    this.load();
  }

  socketOnMessage(message: ISocketMessage) {
    const addPlayer = (uid: string) => {
      const newPlayer = new Player(this.canvas);
      newPlayer.uid = uid;
      const controller = new SocketController(newPlayer);
      this.controllers.push(controller);
      this.players.push(newPlayer);
    };
    console.log(message);
    if (message.type === "welcome") {
      this.mainPlayer.uid = message.payload.uid;
      (message.payload as WelcomeMessage).players.forEach(addPlayer);
    } else if (message.type === "new-player") {
      addPlayer(message.payload.uid);
    }
  }

  async load() {
    await this.canvas.loadProgram();

    this.socket = new SocketHandler(this.socketOnMessage.bind(this));

    this.mainPlayer.build(this.canvas);

    const floorSize = 10;
    const floor = [];
    for (let i = -floorSize; i < floorSize; i++) {
      for (let j = -floorSize; j < floorSize; j++) {
        floor.push(new Cube(this.canvas, [i, 0, j]));
      }
    }

    this.cubes = [
      new Cube(this.canvas, [1, 1, 1]),
      new Cube(this.canvas, [2, 2, 0]),
      new Cube(this.canvas, [3, 3, -1]),
      new Cube(this.canvas, [1, 4, -1]),
      new Cube(this.canvas, [0, 2, -5], [0.5, 3, 0.5]),
      ...floor
    ];

    this.controllers.push(new KeyboardController(this.mainPlayer, this.canvas));

    this.camera = new EntityCamera(this.mainPlayer);
    // this.camera = new FixedCamera([0, 3, 0], [Math.PI / 2, 0, 0]);

    this.start();
  }

  start() {
    requestAnimationFrame(this.render.bind(this));
  }

  render(time: number) {
    const delta = time - this.lastTime;
    this.lastTime = time;

    this.canvas.clearCanvas();

    for (const controller of this.controllers) {
      controller.update();
    }

    // updates
    for (const player of this.players) {
      player.update();
    }

    for (const cube of this.cubes) {
      cube.update(delta);
      //check if the player is colliding with any cubes
      // should we check all players or just myself?
      for (const player of this.players) {
        if (cube.isCollide(player)) {
          player.pushOut(cube);
        }
      }
    }

    // rendering
    const camPos = this.camera.pos;
    const camRot = this.camera.rot;

    for (const cube of this.cubes) {
      cube.render(camPos, camRot);
    }

    for (const player of this.players) {
      player.render(camPos, camRot);
    }

    requestAnimationFrame(this.render.bind(this));
  }
}
