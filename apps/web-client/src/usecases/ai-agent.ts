import { Direction, PlayerController } from "@craft/engine";

export class AiAgentController extends PlayerController {
  update(): void {
    this.move([Direction.Forwards]);
  }

  cleanup(): void {
    throw new Error("Method not implemented.");
  }
}
