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
  SocketInterface.send(
    SocketMessage.make(ISocketMessageType.playerActions, playerAction.getDto())
  );
}

export class SocketPlayerController extends EntityController {
  private listener: SocketListener;

  static sendPlayerAction(playerAction: PlayerAction) {
    console.log("Sending a player action", playerAction);
    SocketInterface.send(
      SocketMessage.make(
        ISocketMessageType.playerActions,
        playerAction.getDto()
      )
    );
  }

  constructor(private game: Game, private player: Player) {
    super();
    this.listener = (message: SocketMessage) => {
      console.log("Got message", message);

      if (message.isType(ISocketMessageType.playerActions)) {
        if (message.data.data.playerUid !== this.player.uid) return;

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
