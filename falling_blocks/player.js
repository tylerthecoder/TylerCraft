class Player {
  pos = [0, 0, 0];
  rot = [Math.PI / 2, 0, 0];
  dim = [1, 3, 1];
  vel = [0, 0, 0];

  onGround = false;

  constructor() {
    this.keys = new Set();

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

  handleMouse(e) {
    if (this.mousedown) {
      const speed = .001;
      const dx = e.movementX * speed;
      const dy = e.movementY * speed;
      this.rotate([dy, -dx, 0])
    }
  }

  move(p) {
    for (let i = 0; i < p.length; i++) {
      this.pos[i] += p[i];
    }
  }

  rotate(r) {
    for (let i = 0; i < r.length; i++) {
      this.rot[i] += r[i];
    }
    if (this.rot[0] < 0) this.rot[0] = 0;
    if (this.rot[0] > Math.PI) this.rot[0] = Math.PI;
  }

  update() {
    this.onGround = false;
    this.handleKeys();
    this.gravity();
    this.pos[1] += this.vel[1];
  }

  jump() {
    if (!this.onGround) {
      this.vel[1] = .2;
    }
  }

  gravity() {
    this.vel[1] -= .007;
  }

  pushOut(cube) {
    // only check y dir right now
    const dir = 1;
    this.pos[dir] = cube.pos[dir] + 3.5;
    this.onGround = true;
    this.vel[1] = 0;
  }
}