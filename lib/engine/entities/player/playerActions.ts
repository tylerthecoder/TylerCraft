// Player actions are an API that lets you controll a player
// The player should know nothing about these.

import { BlockType } from "@craft/rust-world";
import { CameraRay, Direction, Game, IDim, Vector3D } from "../../index.js";
import { MessageDto, MessageHolder } from "../../messageHelpers.js";
import CubeHelpers from "../cube.js";
import { Player } from "./player.js";

export enum PlayerActionType {
  Jump = "jump",
  PlaceBlock = "placeBlock",
  RemoveBlock = "removeBlock",
  ToggleCreative = "toggleCreative",
  Move = "move",
  Rotate = "rotate",
  SetPos = "setPlayerPos",
  BeltLeft = "playerBeltLeft",
  BeltRight = "playerBeltRight",
  SetBeltIndex = "playerSetBeltIndex",
  PlaceDebugBlock = "placeDebugBlock",
}

interface BasePlayerAction {
  playerUid: string;
}

export interface PlayerActionData
  extends Record<PlayerActionType, BasePlayerAction> {
  [PlayerActionType.Rotate]: {
    playerUid: string;
    playerRot: IDim;
  };
  [PlayerActionType.Move]: {
    playerUid: string;
    playerRot: IDim;
    directions: Direction[];
  };
  [PlayerActionType.SetBeltIndex]: {
    playerUid: string;
    index: number;
  };
  [PlayerActionType.BeltLeft]: {
    playerUid: string;
  };
  [PlayerActionType.BeltRight]: {
    playerUid: string;
  };
  [PlayerActionType.Jump]: {
    playerUid: string;
  };
  [PlayerActionType.SetPos]: {
    playerUid: string;
    pos: IDim;
  };
  [PlayerActionType.PlaceBlock]: {
    playerUid: string;
    playerPos: IDim;
    playerRot: IDim;
  };
  [PlayerActionType.RemoveBlock]: {
    playerUid: string;
    playerPos: IDim;
    playerRot: IDim;
  };
  [PlayerActionType.PlaceDebugBlock]: {
    playerUid: string;
  };
}

export type PlayerActionDto = MessageDto<PlayerActionType, PlayerActionData>;

export class PlayerAction extends MessageHolder<
  PlayerActionType,
  PlayerActionData
> {
  static make<T extends PlayerActionType>(type: T, data: PlayerActionData[T]) {
    return new PlayerAction(type, data);
  }
}

export class PlayerActionService {
  constructor(private game: Game) {}

  private playerActions = new Map<
    string,
    Array<(action: PlayerAction) => void>
  >();

  addActionListener(
    playerId: string,
    listener: (action: PlayerAction) => void
  ) {
    this.playerActions.set(playerId, [
      ...(this.playerActions.get(playerId) || []),
      listener,
    ]);
  }

  performAction(action: PlayerAction) {
    const playerId = action.data.playerUid;
    const player = this.game.entities.tryGet(playerId);

    if (!player) {
      console.log("Player not found", playerId);
      return;
    }

    if (!(player instanceof Player)) {
      console.log("Entity is not a player", player);
      return;
    }

    handlePlayerAction(this.game, player, action);

    const listeners = this.playerActions.get(playerId);
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
    private playerActionService: PlayerActionService,
    private game: Game,
    private player: Player
  ) {}

  jump() {
    const jumpAction = PlayerAction.make(PlayerActionType.Jump, {
      playerUid: this.player.uid,
    });

    this.playerActionService.performAction(jumpAction);
  }

  move(directions: Direction[]) {
    const action = PlayerAction.make(PlayerActionType.Move, {
      directions: Array.from(directions),
      playerUid: this.player.uid,
      playerRot: this.player.rot.data as IDim,
    });

    this.playerActionService.performAction(action);
  }

  primaryAction() {
    const action = PlayerAction.make(PlayerActionType.PlaceBlock, {
      playerUid: this.player.uid,
      playerPos: this.player.pos.data as IDim,
      playerRot: this.player.rot.data as IDim,
    });

    this.playerActionService.performAction(action);
  }

  secondaryAction() {
    const action = PlayerAction.make(PlayerActionType.RemoveBlock, {
      playerUid: this.player.uid,
      playerPos: this.player.pos.data as IDim,
      playerRot: this.player.rot.data as IDim,
    });
    this.playerActionService.performAction(action);
  }

  selectBelt(pos: number) {
    const action = PlayerAction.make(PlayerActionType.SetBeltIndex, {
      playerUid: this.player.uid,
      index: pos,
    });
    this.playerActionService.performAction(action);
  }

  toggleCreative() {
    const action = PlayerAction.make(PlayerActionType.ToggleCreative, {
      playerUid: this.player.uid,
    });
    this.playerActionService.performAction(action);
  }
}

const handlePlayerAction = (
  game: Game,
  player: Player,
  action: PlayerAction
) => {
  // console.log("Handling player action", player, action);
  if (action.isType(PlayerActionType.Rotate)) {
    const { playerRot } = action.data;
    player.rot = new Vector3D(playerRot);
    return;
  }

  if (action.isType(PlayerActionType.Jump)) {
    player.tryJump();
    return;
  }

  if (action.isType(PlayerActionType.PlaceBlock)) {
    const { playerPos, playerRot } = action.data;
    player.pos = new Vector3D(playerPos);
    player.rot = new Vector3D(playerRot);
    player.doPrimaryAction(game);
    return;
  }

  if (action.isType(PlayerActionType.RemoveBlock)) {
    const { playerPos, playerRot } = action.data;
    player.pos = new Vector3D(playerPos);
    player.rot = new Vector3D(playerRot);
    player.doSecondaryAction(game);
    return;
  }

  if (action.isType(PlayerActionType.SetPos)) {
    const { pos } = action.data;
    player.pos = new Vector3D(pos);
    return;
  }

  if (action.isType(PlayerActionType.Move)) {
    const { directions, playerRot } = action.data;
    // TODO this might be unnecessary
    player.rot = new Vector3D(playerRot);
    player.moveDirections = directions;
  }

  if (action.isType(PlayerActionType.BeltLeft)) {
    player.belt.moveLeft();
  }

  if (action.isType(PlayerActionType.BeltRight)) {
    player.belt.moveRight();
  }

  if (action.isType(PlayerActionType.SetBeltIndex)) {
    const { index } = action.data;
    player.belt.setIndex(index);
  }

  if (action.isType(PlayerActionType.PlaceDebugBlock)) {
    const pos = player.pos.floor();
    const cube = CubeHelpers.createCube(BlockType.Gold, pos);
    game.placeBlock(cube);
  }

  if (action.isType(PlayerActionType.ToggleCreative)) {
    player.setCreative(!player.creative);
  }
};
