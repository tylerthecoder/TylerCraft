import { BlockType, Direction } from "@craft/rust-world";
import { EntityAction, GameWrapper } from "./wrappers.js";

// export enum PlayerActionType {
//   Jump = "jump",
//   PlaceBlock = "placeBlock",
//   RemoveBlock = "removeBlock",
//   ToggleCreative = "toggleCreative",
//   Move = "move",
//   Rotate = "rotate",
//   SetPos = "setPlayerPos",
//   BeltLeft = "playerBeltLeft",
//   BeltRight = "playerBeltRight",
//   SetBeltIndex = "playerSetBeltIndex",
//   PlaceDebugBlock = "placeDebugBlock",
// }

// interface BasePlayerAction {
//   playerUid: string;
// }

// export interface PlayerActionData
//   extends Record<PlayerActionType, BasePlayerAction> {
//   [PlayerActionType.Rotate]: {
//     playerUid: string;
//     playerRot: IDim;
//   };
//   [PlayerActionType.Move]: {
//     playerUid: string;
//     playerRot: IDim;
//     directions: Direction[];
//   };
//   [PlayerActionType.SetBeltIndex]: {
//     playerUid: string;
//     index: number;
//   };
//   [PlayerActionType.BeltLeft]: {
//     playerUid: string;
//   };
//   [PlayerActionType.BeltRight]: {
//     playerUid: string;
//   };
//   [PlayerActionType.Jump]: {
//     playerUid: string;
//   };
//   [PlayerActionType.SetPos]: {
//     playerUid: string;
//     pos: IDim;
//   };
//   [PlayerActionType.PlaceBlock]: {
//     playerUid: string;
//     playerPos: IDim;
//     playerRot: IDim;
//   };
//   [PlayerActionType.RemoveBlock]: {
//     playerUid: string;
//     playerPos: IDim;
//     playerRot: IDim;
//   };
//   [PlayerActionType.PlaceDebugBlock]: {
//     playerUid: string;
//   };
// }

// export type PlayerActionDto = MessageDto<PlayerActionType, PlayerActionData>;

// export class PlayerAction extends MessageHolder<
//   PlayerActionType,
//   PlayerActionData
// > {
//   static make<T extends PlayerActionType>(type: T, data: PlayerActionData[T]) {
//     return new PlayerAction(type, data);
//   }
// }

export class PlayerActionService {
  constructor(private game: GameWrapper) {}

  private playerActions = new Map<
    number,
    Array<(action: EntityAction) => void>
  >();

  addActionListener(
    playerId: number,
    listener: (action: EntityAction) => void
  ) {
    this.playerActions.set(playerId, [
      ...(this.playerActions.get(playerId) || []),
      listener,
    ]);
  }

  performAction(action: EntityAction) {
    this.game.handleAction(action);

    const listeners = this.playerActions.get(action.entity_id);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(action);
    }
  }
}

export abstract class PlayerController {
  constructor(
    protected playerActionService: PlayerActionService,
    protected game: GameWrapper,
    protected playerId: number
  ) {}

  jump() {
    const action = this.game.makeJumpAction(this.playerId);
    this.playerActionService.performAction(action);
  }

  rotate(x: number, y: number) {
    // TO-DO
    const action = this.game.makeRotateAction(this.playerId, x, y);
    this.playerActionService.performAction(action);
  }

  move(directions: Direction[]) {
    // TO-DO
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

// const handlePlayerAction = (
//   game: Game,
//   player: Player,
//   action: PlayerAction
// ) => {
//   // console.log("Handling player action", player, action);
//   if (action.isType(PlayerActionType.Rotate)) {
//     const { playerRot } = action.data;
//     player.rot = new Vector3D(playerRot);
//     return;
//   }

//   if (action.isType(PlayerActionType.Jump)) {
//     player.tryJump();
//     return;
//   }

//   if (action.isType(PlayerActionType.PlaceBlock)) {
//     const { playerPos, playerRot } = action.data;
//     player.pos = new Vector3D(playerPos);
//     player.rot = new Vector3D(playerRot);
//     player.doPrimaryAction(game);
//     return;
//   }

//   if (action.isType(PlayerActionType.RemoveBlock)) {
//     const { playerPos, playerRot } = action.data;
//     player.pos = new Vector3D(playerPos);
//     player.rot = new Vector3D(playerRot);
//     player.doSecondaryAction(game);
//     return;
//   }

//   if (action.isType(PlayerActionType.SetPos)) {
//     const { pos } = action.data;
//     player.pos = new Vector3D(pos);
//     return;
//   }

//   if (action.isType(PlayerActionType.Move)) {
//     const { directions, playerRot } = action.data;
//     // TODO this might be unnecessary
//     player.rot = new Vector3D(playerRot);
//     player.moveDirections = directions;
//   }

//   if (action.isType(PlayerActionType.BeltLeft)) {
//     player.belt.moveLeft();
//   }

//   if (action.isType(PlayerActionType.BeltRight)) {
//     player.belt.moveRight();
//   }

//   if (action.isType(PlayerActionType.SetBeltIndex)) {
//     const { index } = action.data;
//     player.belt.setIndex(index);
//   }

//   if (action.isType(PlayerActionType.PlaceDebugBlock)) {
//     const pos = player.pos.floor();
//     const cube = CubeHelpers.createCube(BlockType.Gold, pos);
//     game.placeBlock(cube);
//   }

//   if (action.isType(PlayerActionType.ToggleCreative)) {
//     player.setCreative(!player.creative);
//   }
// };
