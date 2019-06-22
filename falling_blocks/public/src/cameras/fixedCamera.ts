class FixedCamera extends Camera {
  constructor(canvas: CanvasProgram, public pos: IDim, public rot: IDim) {
    super(canvas);
  }

  handleMouse(e: MouseEvent) {
    const speed = 0.002;
    const dx = e.movementX * speed;
    const dy = e.movementY * speed;
    this.rotate(-dy, dx);
  }
}
