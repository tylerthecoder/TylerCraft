class Entity {
    constructor(pos, vel, dim) {
        this.pos = [0, 0, 0];
        this.vel = [0, 0, 0];
        this.dim = [1, 1, 1];
        this.onGround = false;
        this.jumpCount = 0;
        this.pos = pos;
        this.vel = vel;
        this.dim = dim;
    }
    move(p) {
        for (let i = 0; i < p.length; i++) {
            this.pos[i] += p[i];
        }
    }
    gravity() {
        this.vel[1] -= .007;
    }
    isCollide(ent) {
        for (let i = 0; i < 3; i++) {
            if (!(Math.abs(this.pos[i] - ent.pos[i]) < this.dim[i] / 2 + ent.dim[i] / 2)) {
                return false;
            }
        }
        return true;
    }
    pushOut(ent) {
        let min = [Infinity];
        for (let i = 0; i < 3; i++) {
            for (let dir = -1; dir <= 1; dir += 2) {
                const p = this.pos[i] + (this.dim[i] / 2 * dir);
                const c = ent.pos[i] + (ent.dim[i] / 2 * -1 * dir);
                const dist = c - p;
                if (Math.abs(dist) < Math.abs(min[0])) {
                    min = [dist, i, dir];
                }
            }
        }
        ;
        const [_, i, dir] = min;
        this.pos[i] = ent.pos[i] + (ent.dim[i] / 2 + this.dim[i] / 2) * -dir;
        this.vel[i] = 0;
        if (i == 1 && dir == -1) {
            this.onGround = true;
            this.jumpCount = 0;
        }
    }
}
//# sourceMappingURL=entity.js.map