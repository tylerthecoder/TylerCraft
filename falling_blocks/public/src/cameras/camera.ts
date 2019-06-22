abstract class Camera {
  abstract pos: IDim;
  abstract rot: IDim;

  constructor(canvas: CanvasProgram) {
    window.addEventListener("mousedown", () => {
      canvas.canvas.requestPointerLock();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === canvas.canvas) {
        this.handleMouse(e);
      }
    });
  }

  abstract handleMouse(e: MouseEvent): void;

  rotate(x: number, y: number) {
    this.rot[0] += x;
    this.rot[1] += y;
  }
}
