class Cube extends Entity {
    constructor(canvas, pos, dim = [1, 1, 1]) {
        super(pos, [0, 0, 0], dim);
        this.falling = false;
        const textures = [
            canvas.textures.dirtGrass,
            canvas.textures.dirtGrass,
            canvas.textures.grass,
            canvas.textures.dirt,
            canvas.textures.dirtGrass,
            canvas.textures.dirtGrass
        ];
        this.form = new CubeForm(canvas, textures, dim);
    }
    update(_delta) {
        if (this.falling) {
            this.gravity();
        }
        for (let i = 0; i < 3; i++) {
            this.pos[i] += this.vel[i];
        }
    }
    render(camPos, camRot) {
        this.form.render(this.pos, camPos, camRot);
    }
}
//# sourceMappingURL=cube.js.map