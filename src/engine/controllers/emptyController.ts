import { GameController } from "./controller.js";

export class EmptyController extends GameController {
	update(delta: number): void {
		// NO-OP
	}
}