class SpectatorController extends Controller {
  constructor(public entity: Entity) {
    super();
  }

  // other people do not need to see spectators
  // so we do not need to send to socket
  keysChange() {}

  update() {
    this.wasdKeys();
    this.qeKeys();
  }
}
