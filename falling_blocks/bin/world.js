class World {
    constructor() {
        this.lastTime = 0;
        this.canvas = new CanvasProgram();
        this.load();
    }
    async load() {
        await this.canvas.loadProgram();
        const floorSize = 3;
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
    render(time) {
        const delta = time - this.lastTime;
        this.lastTime = time;
        this.canvas.clearCanvas();
        this.player.update();
        for (const cube of this.cubes) {
            cube.update(delta);
            if (cube.isCollide(this.player)) {
                this.player.pushOut(cube);
            }
        }
        const playerPos = this.player.camPos;
        const playerRot = this.player.rot.slice(0);
        for (const cube of this.cubes) {
            cube.render(playerPos, playerRot);
        }
        this.player.render();
        requestAnimationFrame(this.render.bind(this));
    }
}
//# sourceMappingURL=world.js.map