import { Controller } from "./controller";
import { Player } from "../../src/entities/player";
import { MetaAction, Entity } from "../../src/entities/entity";
import { ClientGame } from "../clientGame";
import { IActionType, IDim } from "../../types";

export class PlayerKeyboardController extends Controller {
  timer = 0;

  maxTime = 100;

  constructor(
    public controlled: Entity,
    public game: ClientGame,
  ) {
    super();
    this.setKeyListeners();
  }

  keysChange() {
    // NO_OP
  }

  sendPos() {
    this.game.addAction({
      type: IActionType.playerSetPos,
      playerSetPos: {
        uid: this.controlled.uid,
        pos: this.controlled.pos.data as IDim,
      }
    });
  }

  private numOfUpdates = 0;

  update(delta: number) {
    this.wasdKeys(delta);
    if (this.controlled instanceof Player) {
      const player = this.controlled;

      // the player is "holding" when the key is pressed
      player.fire.holding = this.keys.has("f");

      if (this.keys.has("f")) {
        player.fireball();
      }


      if (this.controlled.creative) {
        this.ifHasKeyThenAddMeta(" ", MetaAction.up);
        this.ifHasKeyThenAddMeta("shift", MetaAction.down);
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
    } else {
      this.ifHasKeyThenAddMeta(" ", MetaAction.up);
      this.ifHasKeyThenAddMeta("shift", MetaAction.down);
    }

  }
}
