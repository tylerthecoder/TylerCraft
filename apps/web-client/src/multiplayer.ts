import {
  Game,
  GameAction,
  ISocketMessageType,
  Player,
  PlayerAction,
  SocketMessage,
  handlePlayerAction,
} from "@craft/engine";
import { SocketInterface } from "./app";

export class MultiplayerUseCase {
  debug = true;

  constructor(private game: Game, private mainPlayer: Player) {
    game.addGameActionListener(this.onGameAction.bind(this));
    mainPlayer.addActionListener(this.onPlayerAction.bind(this));
    SocketInterface.addListener(this.onSocketMessage.bind(this));
  }

  onGameAction(action: GameAction) {
    if (this.debug) {
      console.log("Sending game action", action);
    }
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.actions, action.getDto())
    );
  }

  onPlayerAction(action: PlayerAction) {
    if (this.debug) {
      console.log("Sending player action", action);
    }
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.playerActions, action.getDto())
    );
  }

  onSocketMessage(message: SocketMessage) {
    if (message.isType(ISocketMessageType.gameDiff)) {
      this.game.handleStateDiff(message.data);
    } else if (message.isType(ISocketMessageType.playerActions)) {
      if (message.data.data.playerUid === this.mainPlayer.uid) return;

      const player = this.game.entities.tryGet(message.data.data.playerUid);

      if (!player) {
        console.log("Player not found", message.data.data.playerUid);
        return;
      }

      if (!(player instanceof Player)) {
        console.log("Entity is not a player", player);
        return;
      }

      const playerAction = new PlayerAction(
        message.data.type,
        message.data.data
      );

      handlePlayerAction(this.game, player, playerAction);
    }
  }
}
