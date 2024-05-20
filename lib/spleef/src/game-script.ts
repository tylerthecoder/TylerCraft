import { Game, IGameScript, Vector3D } from "@craft/engine";
import CubeHelpers from "@craft/engine/dist/entities/cube.js";
import { BlockType } from "@craft/rust-world";

export class SpleefGameScript implements IGameScript {
  constructor(private game: Game) {}

  async buildMap() {
    const dim = 20;

    const gridPoints = [];
    for (let i = -dim; i < dim; i++) {
      for (let j = -dim; j < dim; j++) {
        const pos = new Vector3D([i, 0, j]);
        gridPoints.push(pos);
        await this.game.loadPos(pos);
      }
    }

    // await Promise.all(gridPoints.map((point) => this.game.loadPos(point)));

    for (let i = -dim; i < dim; i++) {
      for (let j = -dim; j < dim; j++) {
        const pos = new Vector3D([i, 0, j]);

        this.game.placeBlock(CubeHelpers.createCube(BlockType.Gold, pos));
      }
    }
  }

  async setup() {
    await this.buildMap();
  }

  update() {
    // Run the game
  }
}
