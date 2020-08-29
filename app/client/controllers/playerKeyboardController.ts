import { Controller } from "./controller";
import { Player } from "../../src/entities/player";
import { MetaAction } from "../../src/entities/entity";
import { SocketHandler } from "../socket";
import { ClientGame } from "../clientGame";
import { IActionType } from "../../types";

export class PlayerKeyboardController extends Controller {
  timer = 0;

  maxTime = 100;

  constructor(
    public controlled: Player,
    public game: ClientGame,
  ) {
    super();
    this.setKeyListeners();
  }

  keysChange() {
  }

  sendKeys() {
  }

  sendPos() {
    this.game.actions.push({
      type: IActionType.playerSetPos,
      playerSetPos: {
        uid: this.controlled.uid,
        pos: this.controlled.pos,
      }
    });
  }

  private numOfUpdates = 0;

  update(delta: number) {
    this.wasdKeys(delta);
    this.ifHasKeyThenAddMeta("f", MetaAction.fireball);

    if (this.keys.has("f")) {
      this.controlled.metaActions.add(MetaAction.fireball);
    } else {
      this.controlled.canFire = true;
    }

    if (this.controlled.spectator) {
      this.qeKeys();
    } else {
      this.ifHasKeyThenAddMeta(" ", MetaAction.jump);
    }

    // if there were any actions performed
    if (this.controlled.metaActions.size > 0) {
      this.numOfUpdates++;

      if (this.numOfUpdates > 10) {
        this.numOfUpdates = 0;
        this.sendPos();
      }
    }
  }
}
