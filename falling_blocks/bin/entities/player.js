class Player extends Entity {
    constructor(canvas) {
        super([0, 5, 0], [0, 0, 0], [1, 2, 1]);
        this.rot = [Math.PI / 2, 0, 0];
        this.camOffset = [0, 3, 0];
        this.thirdPerson = true;
        this.onGround = false;
        this.jumpCount = 0;
        this.controller = new KeyboardController(this);
        this.form = new CubeForm(canvas, canvas.playerTexture);
    }
    get camPos() {
        this.camOffset[0] = -Math.sin(this.rot[1]) * 3;
        this.camOffset[2] = Math.cos(this.rot[1]) * 3;
        return this.pos.map((x, i) => x + this.camOffset[i]).slice(0);
    }
    rotate(r) {
        for (let i = 0; i < r.length; i++) {
            this.rot[i] += r[i];
        }
        if (this.rot[0] < 0)
            this.rot[0] = 0;
        if (this.rot[0] > Math.PI)
            this.rot[0] = Math.PI;
    }
    update() {
        this.onGround = false;
        this.controller.update();
        this.gravity();
        this.move(this.vel);
    }
    render() {
        if (this.thirdPerson) {
            this.form.render(this.dim, this.pos, 0, this.camPos, this.rot);
        }
    }
    jump() {
        if (this.jumpCount < 5) {
            this.vel[1] = 0.1;
            this.jumpCount++;
        }
    }
}
//# sourceMappingURL=player.js.map