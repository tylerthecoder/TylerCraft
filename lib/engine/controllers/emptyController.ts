import { GameController } from "./controller.js";

export class EmptyController extends GameController {
  update(_delta: number): void {
    // NO-OP
  }
}
