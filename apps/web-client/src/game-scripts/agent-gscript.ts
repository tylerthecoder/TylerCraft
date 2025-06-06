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

  public config = {
    enabled: true,
    maxAgents: 10,
    agentSpeed: 0.1,
    spawnRadius: 50,
  };

  private controllers: AiAgentController[] = [];
  private playerActionService = new PlayerActionService(this.game);

  actions? = {
    "make-ai-agent": () => this.makeAiAgent(),
  };

  setConfig(config: typeof this.config): void {
    this.config = { ...this.config, ...config };
    console.log("AgentGScript config updated:", this.config);
  }

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
