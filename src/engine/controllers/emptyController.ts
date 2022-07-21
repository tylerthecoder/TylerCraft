import { GameController } from "./controller";

export class EmptyController extends GameController {
	update(delta: number): void {
		// NO-OP
	}
}