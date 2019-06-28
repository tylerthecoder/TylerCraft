abstract class Controller {
  keys = new Set();

  constructor() {
    window.addEventListener("keydown", ({ key }) => {
      this.keys.add(key.toLowerCase());
    });
    window.addEventListener("keyup", ({ key }) => {
      this.keys.delete(key.toLowerCase());
    });
  }

  abstract entity: Entity;
  abstract update(): void;
  abstract keysChange(): void;

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

    if (this.entity instanceof Player) {
      if (this.keys.has(" ")) {
        this.entity.jump();
      }

      if (this.keys.has("f")) {
        this.entity.fireball();
      } else {
        this.entity.canFire = true;
      }
    }
  }

  qeKeys() {
    const speed = 0.1;

    if (this.keys.has("q")) this.entity.move([0, speed, 0]);
    if (this.keys.has("e")) this.entity.move([0, -speed, 0]);
  }
}
