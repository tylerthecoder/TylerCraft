class KeyboardController {
    constructor(player, canvas) {
        this.jumpCount = 0;
        this.keys = new Set();
        this.player = player;
        this.keys = new Set();
        window.addEventListener("keydown", ({ key }) => this.keys.add(key.toLowerCase()));
        window.addEventListener("keyup", ({ key }) => this.keys.delete(key.toLowerCase()));
        window.addEventListener("mousedown", () => {
            canvas.canvas.requestPointerLock();
            canvas.canvas.requestFullscreen();
        });
        window.addEventListener("mousemove", this.handleMouse.bind(this));
    }
    getSphereCords(r, t, p) {
        const cords = [
            r * Math.sin(p) * Math.sin(t),
            r * Math.cos(p),
            r * Math.sin(p) * Math.cos(t)
        ];
        return cords;
    }
    update() {
        this.handleKeys();
    }
    handleKeys() {
        const speed = 0.1;
        const k = (key, amount) => {
            if (this.keys.has(key)) {
                this.player.move(this.getSphereCords(...amount));
            }
        };
        k("w", [-speed, -this.player.rot[1], Math.PI / 2]);
        k("s", [speed, -this.player.rot[1], Math.PI / 2]);
        k("a", [speed, -this.player.rot[1] - Math.PI / 2, Math.PI / 2]);
        k("d", [speed, -this.player.rot[1] + Math.PI / 2, Math.PI / 2]);
        if (this.keys.has(" ")) {
            this.player.jump();
        }
    }
    handleMouse(e) {
        const speed = 0.002;
        const dx = e.movementX * speed;
        const dy = e.movementY * speed;
        this.player.rotate([-dy, dx, 0]);
    }
}
//# sourceMappingURL=keyboard.js.map