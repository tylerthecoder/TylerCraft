import {
  Direction,
  EntityActionDto,
  Game,
  JumpAction,
  MoveAction,
  RotateAction,
  SecondaryBeltAction,
  SelectItemAction,
  SphericalRotation,
  UsePrimaryItemAction,
} from "@craft/rust-world";
export abstract class PlayerController {
  constructor(
    protected game: Game,
    protected handleAction: (action: EntityActionDto) => void,
    protected playerId: number
  ) {}

  jump() {
    const action = JumpAction.make_wasm(this.playerId);
    this.handleAction(action);
  }

  rotate(x: number, y: number) {
    const rotDiff = SphericalRotation.new_wasm(x, y);
    const action = RotateAction.make_wasm(this.playerId, rotDiff);
    this.handleAction(action);
  }

  move(direction: Direction | "None") {
    let action: EntityActionDto;
    if (direction === "None") {
      action = MoveAction.make_wasm(this.playerId, undefined);
    } else {
      action = MoveAction.make_wasm(this.playerId, direction);
    }
    this.handleAction(action);
  }

  beltRight() {
    const player = this.game.getEntityAsPlayer(this.playerId);
    if (!player) {
      return;
    }
    const index = player.belt.selected_item;
    if (index === 9) {
      return;
    }
    const action = SelectItemAction.make_wasm(this.playerId, index + 1);
    this.handleAction(action);
  }

  beltLeft() {
    const player = this.game.getEntityAsPlayer(this.playerId);
    if (!player) {
      return;
    }
    const index = player.belt.selected_item;
    if (index === 0) {
      return;
    }
    const action = SelectItemAction.make_wasm(this.playerId, index - 1);
    this.handleAction(action);
  }

  selectBelt(pos: number) {
    const action = SelectItemAction.make_wasm(this.playerId, pos);
    this.handleAction(action);
  }

  debugBlock() {
    // TO-DO
  }

  primaryAction() {
    const action = UsePrimaryItemAction.make_wasm(this.playerId);
    this.handleAction(action);
  }

  secondaryAction() {
    const action = SecondaryBeltAction.make_wasm(this.playerId);
    this.handleAction(action);
  }

  toggleCreative() {
    // const action = PlayerAction.make(PlayerActionType.ToggleCreative, {
    //   playerUid: this.player.uid,
    // });
    // this.playerActionService.performAction(action);
  }
}
