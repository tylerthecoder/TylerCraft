import {
  Direction,
  EntityActionDto,
  JumpAction,
  MoveAction,
  RotateAction,
  SphericalRotation,
} from "@craft/rust-world";
export abstract class PlayerController {
  constructor(
    protected handleAction: (action: EntityActionDto) => void,
    protected playerId: number
  ) { }

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
    // TO-DO
  }

  beltLeft() {
    // TO-DO
  }

  debugBlock() {
    // TO-DO
  }

  primaryAction() {
    // const action = PlayerAction.make(PlayerActionType.PlaceBlock, {
    //   playerUid: this.player.uid,
    //   playerPos: this.player.pos.data as IDim,
    //   playerRot: this.player.rot.data as IDim,
    // });
    // this.playerActionService.performAction(action);
  }

  secondaryAction() {
    // const action = PlayerAction.make(PlayerActionType.RemoveBlock, {
    //   playerUid: this.player.uid,
    //   playerPos: this.player.pos.data as IDim,
    //   playerRot: this.player.rot.data as IDim,
    // });
    // this.playerActionService.performAction(action);
  }

  selectBelt(pos: number) {
    // const action = PlayerAction.make(PlayerActionType.SetBeltIndex, {
    //   playerUid: this.player.uid,
    //   index: pos,
    // });
    // this.playerActionService.performAction(action);
  }

  toggleCreative() {
    // const action = PlayerAction.make(PlayerActionType.ToggleCreative, {
    //   playerUid: this.player.uid,
    // });
    // this.playerActionService.performAction(action);
  }
}
