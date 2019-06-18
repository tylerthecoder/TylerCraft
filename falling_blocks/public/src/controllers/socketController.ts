class SocketController extends Controller {
  socket: SocketHandler;

  keys = new Set();

  constructor(public player: Player) {
    super();
    this.socket = new SocketHandler(this.onMessage.bind(this));
  }

  onMessage(message: ISocketMessage) {
    console.log(message);
    if (message.type === "keys") {
      const payload = message.payload as KeyPressMessage;
      if (payload.uid === this.player.uid) {
        this.keys = new Set((message.payload as KeyPressMessage).keys);
      }
    }
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
}
