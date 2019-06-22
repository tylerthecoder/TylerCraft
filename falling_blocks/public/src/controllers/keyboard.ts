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
}
