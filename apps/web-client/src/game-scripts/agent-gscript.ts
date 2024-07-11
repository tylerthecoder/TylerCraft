import {
  Direction,
  PlayerActionService,
  PlayerController,
} from "@craft/engine";
import { GameScript } from "@craft/engine/game-script";

export class AiAgentController extends PlayerController {
  update(): void {
    this.move([Direction.Forwards]);
  }

  cleanup(): void {
    throw new Error("Method not implemented.");
  }
}

export class AgentGScript extends GameScript {
  name = "agent";
  private controllers: AiAgentController[] = [];
  private playerActionService = new PlayerActionService(this.game);

  actions? = {
    "make-ai-agent": () => this.makeAiAgent(),
  };

  private makeAiAgent() {
    const player = this.game.addPlayer("ai");
    const controller = new AiAgentController(
      this.playerActionService,
      this.game,
      player
    );
    this.controllers.push(controller);
  }

  update(_delta: number): void {
    for (const controller of this.controllers) {
      controller.update();
    }
  }
}
