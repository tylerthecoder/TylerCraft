class SpectatorController extends Controller {
  constructor(public entity: Entity) {
    super();
    this.setKeyListeners();
  }

  // other people do not need to see spectators
  // so we do not need to send to socket
  keysChange() {}

  update(delta: number) {
    this.wasdKeys(delta);
    this.qeKeys();
  }
}
