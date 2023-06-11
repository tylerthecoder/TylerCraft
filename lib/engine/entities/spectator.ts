import { Entity, FaceLocater } from "./entity.js";
import { IDim } from "../types.js";
import { Vector3D } from "../utils/vector.js";

export class Spectator {
  // Entity overrides
  pos = new Vector3D([0, 5, 0]);
  dim: IDim = [1, 2, 1];
  gravitable = false;
  intangible = true;

  constructor() {
    // super();
    // this.uid = Random.randomString()
  }

  // getActions(): IAction[] {
  //   const actions: IAction[] = [];

  //   const wasdVel = this.getWasdVel();
  //   const vertVel = this.getVerticalVel();

  //   const totVel = wasdVel.add(vertVel);

  //   if (!totVel.equals(this.vel)) {
  //     actions.push({
  //       type: IActionType.setEntVel,
  //       setEntVel: {
  //         vel: totVel.data as IDim,
  //         uid: this.uid,
  //       }
  //     })
  //   }

  //   return actions;
  // }

  update(delta: number) {
    // this.baseUpdate(delta)
  }

  hit(_entity: Entity, _where: FaceLocater) {
    /* NO-OP */
  }
}
