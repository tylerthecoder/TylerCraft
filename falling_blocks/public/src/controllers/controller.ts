abstract class Controller {
  keys = new Set();

  abstract entity: Entity;
  abstract update(): void;

  getSphereCords(r: number, t: number, p: number) {
    const cords = [
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
      r * Math.sin(p) * Math.cos(t)
    ];
    return cords as IDim;
  }

  wasdKeys() {
    const speed = 0.1;

    const k = (key: string, amount: [number, number, number]) => {
      if (this.keys.has(key)) {
        this.entity.move(this.getSphereCords(...amount));
      }
    };

    k("w", [-speed, -this.entity.rot[1], Math.PI / 2]);
    k("s", [speed, -this.entity.rot[1], Math.PI / 2]);
    k("a", [speed, -this.entity.rot[1] - Math.PI / 2, Math.PI / 2]);
    k("d", [speed, -this.entity.rot[1] + Math.PI / 2, Math.PI / 2]);

    if (this.keys.has(" ")) {
      const player = this.entity as Player;
      if (player.jump) {
        player.jump();
      }
    }
  }
}
