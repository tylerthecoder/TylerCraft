// Basic Idea:
// When a player presses "f", a fireball is created
// It moves forward dropping slowly
// When it hits a block, it converts the block to ash
// When it hits ash, the ash disappears
// When it hits a player, the player is knocked back
import { GameAction } from "@craft/engine/gameActions";

export enum FireBallActions {
	ShootFireball = "shootFireball",
}

export type FireballAction = GameAction | FireBallActions;
export const FireballAction = { ...GameAction, ...FireBallActions };

// export class FireballController extends MouseAndKeyController {

// 	handleKeyDown(key: string): void {
// 		super.handleKeyDown(key);

// 		if (key === "f") {
// 			this.game.handleAction(, actionData);
// 		}
// 	}

// }
