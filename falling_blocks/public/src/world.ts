class World {
  canvas: CanvasProgram;

  cubes: Cube[] = [];
  players: Player[] = [];
  controllers: Controller[] = [];
  chunks: Chunk[] = [];

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
    await this.canvas.loadProgram();

    this.socket = new SocketHandler(this.socketOnMessage.bind(this));

    this.mainPlayer.build(this.canvas);

    const numOfChunks = 1; // squared
    const chunkDim = 1;

    const spacing = chunkDim * 2 + 1;

    for (let i = -numOfChunks; i <= numOfChunks; i++) {
      for (let j = -numOfChunks; j <= numOfChunks; j++) {
        const cubes = [];
        const chunkPos = [i * spacing, 0, j * spacing] as [
          number,
          number,
          number
        ];
        for (let k = chunkPos[0] - chunkDim; k <= chunkPos[0] + chunkDim; k++) {
          for (
            let l = chunkPos[2] - chunkDim;
            l <= chunkPos[2] + chunkDim;
            l++
          ) {
            const pos = [k, 0, l] as [number, number, number];
            cubes.push(new Cube(this.canvas, pos));
          }
        }
        const chunk = new Chunk(cubes, this.canvas, chunkPos);
        this.chunks.push(chunk);
        this.cubes.push(...cubes);
      }
    }

    const chunkCubes = [
      new Cube(this.canvas, [1, 1, 1]),
      new Cube(this.canvas, [2, 2, 0]),
      new Cube(this.canvas, [3, 3, -1]),
      new Cube(this.canvas, [1, 4, -1])
    ];

    this.cubes.push(...chunkCubes);

    const chunk = new Chunk(chunkCubes, this.canvas, [0, 0, 0]);

    this.chunks.push(chunk);

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
      // cube.render(camPos, camRot);
    }

    for (const player of this.players) {
      player.render(camPos, camRot);
    }

    for (const chunk of this.chunks) {
      chunk.render(camPos, camRot);
    }

    requestAnimationFrame(this.render.bind(this));
  }
}
