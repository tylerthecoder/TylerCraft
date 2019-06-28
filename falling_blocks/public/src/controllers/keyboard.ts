class KeyboardController extends Controller {
  timer = 0;

  maxTime = 100;

  constructor(public entity: Entity) {
    super();
  }

  keysChange() {
    // maybe only do this on a tick
    this.sendKeys();
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
