class KeyboardController extends Controller {
  keys = new Set();

  timer = 0;

  maxTime = 100;

  constructor(public entity: Player, public canvas: CanvasProgram) {
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
        uid: this.entity.uid
      }
    });
  }

  sendPos() {
    const message = {
      type: "pos",
      payload: {
        pos: this.entity.pos,
        uid: this.entity.uid
      }
    };
    SocketHandler.send(message);
  }

  update() {
    this.wasdKeys();
    if (++this.timer >= this.maxTime) {
      this.sendPos();
      this.timer = 0;
    }
  }

  handleMouse(e: MouseEvent) {
    if (document.pointerLockElement === this.canvas.canvas) {
      const speed = 0.002;
      const dx = e.movementX * speed;
      const dy = e.movementY * speed;
      this.entity.rotate([-dy, dx, 0]);
    }
  }
}
