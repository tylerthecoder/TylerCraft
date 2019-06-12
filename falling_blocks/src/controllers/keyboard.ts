class KeyboardController {
  jumpCount = 0;
  player: Player;
  keys = new Set();
  mouseDown = true;

  constructor(player: Player) {
    this.player = player;
    this.keys = new Set();
    this.setKeyBinding();
  }

  setKeyBinding() {
    window.addEventListener("keydown", ({ key }) => this.keys.add(key));
    window.addEventListener("keyup", ({ key }) => this.keys.delete(key));

    window.addEventListener("mousedown", () => {
      this.mouseDown = true;
    });
    window.addEventListener("mouseup", () => {
      this.mouseDown = false;
    });

    window.addEventListener("mousemove", this.handleMouse.bind(this));
  }

  getSphereCords(r: number, t: number, p: number) {
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

    const k = (key: string, amount: [number, number, number]) => {
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

  handleMouse(e: MouseEvent) {
    if (this.mouseDown) {
      const speed = 0.001;
      const dx = e.movementX * speed;
      const dy = e.movementY * speed;
      this.player.rotate([dy, -dx, 0]);
    }
  }
}
