class PlayerController {
  constructor(player) {
    this.player = player;
    this.keys = new Set();
    this.setKeyBinding();
  }

  setKeyBinding() {
    window.addEventListener("keydown", ({
      key
    }) => this.keys.add(key));
    window.addEventListener("keyup", ({
      key
    }) => this.keys.delete(key));

    window.addEventListener("mousedown", () => {
      this.mousedown = true
    });
    window.addEventListener("mouseup", () => {
      this.mousedown = false
    });

    window.addEventListener("mousemove", this.handleMouse.bind(this))
  }

  getSphereCords(r, t, p) {
    const cords = [
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
      r * Math.sin(p) * Math.cos(t),
    ];
    return cords;
  }

  handleKeys() {
    const speed = .1

    const k = (key, amount) => {
      if (this.keys.has(key)) {
        this.move(this.getSphereCords(...amount));
      }
    }

    k("w", [-speed, -this.rot[1], this.rot[0]]);
    k("s", [speed, -this.rot[1], this.rot[0]]);
    k("a", [speed, -this.rot[1] - Math.PI / 2, this.rot[0]]);
    k("d", [speed, -this.rot[1] + Math.PI / 2, this.rot[0]]);

    if (this.keys.has("q")) this.move([0, speed, 0]);
    if (this.keys.has("e")) this.move([0, -speed, 0]);
    if (this.keys.has(" ")) this.jump();
  }


}