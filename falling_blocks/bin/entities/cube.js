class Cube extends Entity {
    constructor(canvas, pos, dim = [1, 1, 1]) {
        super(pos, [0, 0, 0], dim);
        this.rot = 0;
        this.falling = false;
        this.form = new CubeForm(canvas, canvas.cubeTexture);
    }
    update(_delta) {
        if (this.falling) {
            this.gravity();
        }
        for (let i = 0; i < 3; i++) {
            this.pos[i] += this.vel[i];
        }
    }
    gravity() {
        this.vel[1] -= 0.007;
    }
    render(screenPos, screenRot) {
        this.form.render(this.dim, this.pos, this.rot, screenPos, screenRot);
    }
}
//# sourceMappingURL=cube.js.map