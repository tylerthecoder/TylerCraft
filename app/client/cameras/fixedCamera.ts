import { Camera } from "./camera";
import { IDim } from "../../types";

export class FixedCamera extends Camera {
  constructor(public pos: IDim, public rot: IDim) {
    super();
  }

  handleMouse(e: MouseEvent) {
    const speed = 0.002;
    const dx = e.movementX * speed;
    const dy = e.movementY * speed;
    this.rotate([-dy, dx, 0]);
  }

  getActions() {
    const actions = [];
    actions.push(...this.getPlanerActionsFromMetaActions());
    return actions;
  }
}
