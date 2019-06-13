class World {
  canvas: CanvasProgram;

  cubes: Cube[];
  player: Player;

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
      new Cube(this.canvas, [0, 2, -5], [0.5, 3, 0.5]),
      ...floor
    ];

    this.player = new Player(this.canvas);

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
    const playerPos = this.player.camPos;
    const playerRot = this.player.rot.slice(0);

    for (const cube of this.cubes) {
      cube.render(playerPos, playerRot);
    }
    this.player.render();

    requestAnimationFrame(this.render.bind(this));
  }
}
