import { Entity, FaceLocater } from "./entity";
import { Game } from "../game";
import { IDim, IAction } from "../../types";
import Random from "../utils/random";
import { Vector } from "../utils/vector";

export class Spectator extends Entity {
  // Entity overrides
  pos = new Vector([0, 5, 0]);
  dim: IDim = [1, 2, 1];
  rot: IDim = [0, 0, 0];
  gravitable = false;
  tangible = false;

  constructor() {
    super();
    this.uid = Random.randomString()
  }

  getActions(): IAction[] {
    const actions = this.getPlanerActionsFromMetaActions();
    return actions;
  }

  setMoveVel(amount: { x: number; y: number }) {
    this.vel[0] = amount.x;
    this.vel[2] = amount.y;
  }

  update(delta: number) {
    this.baseUpdate(delta)
  }

  hit(_entity: Entity, where: FaceLocater) { }
}
