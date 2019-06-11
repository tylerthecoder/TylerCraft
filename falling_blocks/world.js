class World {

  lastTime = 0;

  constructor() {
    this.canvas = new CanvasProgram();
    this.load();
  }

  async load() {
    const gl = this.canvas.gl;
    const program = await this.canvas.getProgram();
    const texture = this.canvas.texture;

    const floorSize = 3;
    const floor = [];
    for (let i = -floorSize; i < floorSize; i++) {
      for (let j = -floorSize; j < floorSize; j++) {
        floor.push(new Cube(gl, program, texture, [i, -3, j]));
      }
    }

    this.cubes = [
      // new Cube(gl, program, texture, [0, 0, 5]),
      // new Cube(gl, program, texture, [0, 0, -5]),
      // new Cube(gl, program, texture, [0, 5, 0]),
      // new Cube(gl, program, texture, [5, 0, 0]),
      // new Cube(gl, program, texture, [-5, 0, 0]),
      ...floor
    ];

    this.player = new Player();

    this.start();
  }

  start() {
    requestAnimationFrame(this.render.bind(this));
  }

  render(time) {
    const delta = time - this.lastTime;
    this.lastTime = time;

    this.canvas.clearCanvas();

    this.player.update();

    const playerPos = this.player.pos.slice(0);
    const playerRot = this.player.rot.slice(0);

    for (const cube of this.cubes) {
      cube.update(delta);
      cube.render(playerPos, playerRot);

      //check if the player is colliding with any cubes
      if (cube.isCollide(this.player) !== -1) {
        this.player.pushOut(cube);
      }
    }


    requestAnimationFrame(this.render.bind(this));
  }
}