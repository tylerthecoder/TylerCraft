class KeyboardController extends Controller {
  keys = new Set();

  constructor(public player: Player, canvas: CanvasProgram) {
    super();

    window.addEventListener("keydown", ({ key }) => {
      this.keys.add(key.toLowerCase());
      this.sendKeys();
    });
    window.addEventListener("keyup", ({ key }) => {
      this.keys.delete(key.toLowerCase());
      this.sendKeys();
    });

    window.addEventListener("mousedown", () => {
      canvas.canvas.requestPointerLock();
      // canvas.canvas.requestFullscreen();
    });

    window.addEventListener("mousemove", this.handleMouse.bind(this));
  }

  sendKeys() {
    SocketHandler.send({
      type: "keys",
      payload: {
        keys: Array.from(this.keys),
        uid: this.player.uid
      }
    });
  }

  getSphereCords(r: number, t: number, p: number) {
    const cords = [
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
      r * Math.sin(p) * Math.cos(t)
    ];
    return cords as IDim;
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
    const speed = 0.002;
    const dx = e.movementX * speed;
    const dy = e.movementY * speed;
    this.player.rotate([-dy, dx, 0]);
  }
}
