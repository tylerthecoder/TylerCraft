class SocketController extends Controller {
  socket: SocketHandler;

  keys = new Set();

  constructor(public entity: Player) {
    super();
    this.socket = new SocketHandler(this.onMessage.bind(this));
  }

  onMessage(message: ISocketMessage) {
    console.log(message);
    if (message.type === "keys") {
      const payload = message.payload as KeyPressMessage;
      if (payload.uid === this.entity.uid) {
        this.keys = new Set((message.payload as KeyPressMessage).keys);
      }
    } else if (message.type === "pos") {
      const payload = message.payload as PositionMessage;
      if (payload.uid === this.entity.uid) {
        this.entity.pos = payload.pos.slice(0) as [number, number, number];
      }
    }
  }

  update() {
    this.wasdKeys();
  }
}
