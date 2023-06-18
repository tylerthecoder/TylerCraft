import {
  EntityController,
  Game,
  ISocketMessageType,
  Player,
  PlayerAction,
  SocketMessage,
  handlePlayerAction,
} from "@craft/engine";
import { SocketInterface } from "../../app";
import { SocketListener } from "../../socket";

export function onPlayerActions(playerAction: PlayerAction) {
  SocketInterface.send({
    type: ISocketMessageType.playerActions,
    data: playerAction.getDto(),
  });
}

export class SocketPlayerController extends EntityController {
  private listener: SocketListener;

  constructor(private game: Game, private player: Player) {
    super();
    this.listener = (message: SocketMessage) => {
      if (message.isType(ISocketMessageType.playerActions)) {
        const playerAction = new PlayerAction(
          message.data.type,
          message.data.data
        );

        handlePlayerAction(this.game, this.player, playerAction);
      }
    };

    SocketInterface.addListener(this.listener);
  }

  update() {
    // Do nothing
  }

  cleanup() {
    SocketInterface.removeListener(this.listener);
  }
}
