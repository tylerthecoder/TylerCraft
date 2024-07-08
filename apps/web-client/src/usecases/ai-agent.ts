import { Direction, Game, Player, PlayerController } from "@craft/engine";
import { IGameScript } from "@craft/engine/game-script";

export class AiAgentController extends PlayerController {
  update(): void {
    this.move([Direction.Backwards]);
  }

  cleanup(): void {
    throw new Error("Method not implemented.");
  }
}

export class AiAgentGameScript implements IGameScript {
  private agent: Player;

  constructor(public game: Game) {
    this.agent = game.addPlayer("agent");
  }

  update() {}
}
