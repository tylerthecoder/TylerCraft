import {
  Direction,
  Game,
  IDim,
  IGameScript,
  Player,
  PlayerAction,
  PlayerActionService,
  PlayerActionType,
  Random,
  Vector3D,
} from "@craft/engine";
import CubeHelpers from "@craft/engine/dist/entities/cube.js";
import { BlockType } from "@craft/rust-world";

export class SpleefGameScript implements IGameScript {
  private playerActionService: PlayerActionService;

  constructor(private game: Game) {
    this.playerActionService = new PlayerActionService(this.game);
  }

  async buildMap() {
    const dim = 10;

    const gridPoints = [];
    for (let i = -dim; i < dim; i++) {
      for (let j = -dim; j < dim; j++) {
        gridPoints.push(new Vector3D([i, 0, j]));
      }
    }

    for (const point of gridPoints) {
      await this.game.loadPos(point);
    }

    for (const point of gridPoints) {
      this.game.placeBlock(CubeHelpers.createCube(BlockType.Gold, point));
    }
  }

  async setup() {
    await this.buildMap();

    // this.game.addPlayer("Harry");
  }

  private cooldown = 1000;

  update(delta: number) {
    // Run the game
    //
    // const harry = this.game.entities.get("Harry") as Player;

    this.cooldown -= delta;

    if (this.cooldown < 0) {
      this.cooldown = 1000;

      // const randDir = Random.randomElement([
      //   Direction.Forwards,
      //   Direction.Backwards,
      //   Direction.Left,
      //   Direction.Right,
      // ]);
      //
      // const action = PlayerAction.make(PlayerActionType.Move, {
      //   directions: [randDir],
      //   playerUid: harry.uid,
      //   playerRot: harry.rot.data as IDim,
      // });
      //
      // this.playerActionService.performAction(harry.uid, action);
    }

    // Get the block harry is standing on
    // const block = this.game.world.getBlockFromWorldPoint(harry.pos);
    // console.log("Harry pos", block?.pos.data.join(","));
  }
}
