import { Entity, FaceLocater } from "./entity";
import { IDim, IAction, IActionType } from "../../types";
import Random from "../utils/random";
import { Vector } from "../utils/vector";
import { MovableEntity } from "./moveableEntity";

export class Spectator extends MovableEntity {
  // Entity overrides
  pos = new Vector([0, 5, 0]);
  dim: IDim = [1, 2, 1];
  gravitable = false;
  tangible = false;

  constructor() {
    super();
    this.uid = Random.randomString()
  }

  getActions(): IAction[] {
    const actions: IAction[] = [];

    const wasdVel = this.getWasdVel();
    const vertVel = this.getVerticalVel();

    const totVel = wasdVel.add(vertVel);

    if (!totVel.equals(this.vel)) {
      actions.push( {
        type: IActionType.setEntVel,
        setEntVel: {
          vel: totVel.data as IDim,
          uid: this.uid,
        }
      })
    }

    return actions;
  }

  update(delta: number) {
    this.baseUpdate(delta)
  }

  hit(_entity: Entity, _where: FaceLocater) {/* NO-OP */}
}
