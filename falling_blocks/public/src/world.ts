class World {
  canvas: CanvasProgram;

  cubes: Cube[];
  player: Player;

  camera: Camera;

  lastTime = 0;

  constructor() {
    this.canvas = new CanvasProgram();
    this.load();
  }

  async load() {
    await this.canvas.loadProgram();

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

    this.player = new Player(this.canvas);

    this.camera = new EntityCamera(this.player);
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

    // updates
    this.player.update();

    for (const cube of this.cubes) {
      cube.update(delta);
      //check if the player is colliding with any cubes
      if (cube.isCollide(this.player)) {
        this.player.pushOut(cube);
      }
    }

    // rendering
    const camPos = this.camera.pos;
    const camRot = this.camera.rot;

    for (const cube of this.cubes) {
      cube.render(camPos, camRot);
    }
    this.player.render(camPos, camRot);

    requestAnimationFrame(this.render.bind(this));
  }
}
