import { GameScript } from "../game-script.js";
import { TerrainGenModule } from "../modules.js";
import { Vector2D } from "../utils/vector.js";

type Config = {
  seed: string;
};

export class ParkorGScript extends GameScript<Config> {
  name = "parkor";

  public config = {
    seed: "",
  };

  async setup(): Promise<void> {
    console.log("Setting up sandbox game script");
    // Load the entire world?

    this.config = {
      seed: this.game.config.seed,
    };
  }

  setConfig(config: Config): void {
    this.config = config;

    // TODO: Update the terrain generator's config
  }

  loadChunk(chunkPos: Vector2D): void {
    const hasChunk = this.game.world.hasChunk(chunkPos);

    if (hasChunk) {
      return;
    }
  }

  // getChunkPosAroundPoint(pos: Vector3D): Vector2D[] {
  //   const centerChunkPos = World.worldPosToChunkPos(pos);
  //
  //   const chunkIds = [];
  //   const loadDistance = this.config.loadDistance;
  //
  //   for (let i = -loadDistance; i < loadDistance; i++) {
  //     for (let j = -loadDistance; j < loadDistance; j++) {
  //       const chunkPos = new Vector2D([
  //         centerChunkPos.get(0) + i,
  //         centerChunkPos.get(1) + j,
  //       ]);
  //       chunkIds.push(chunkPos);
  //     }
  //   }
  //
  //   return chunkIds;
  // }
  //
  // update(_delta: number): void {
  //   if (this.config.infinite) {
  //     for (const entity of this.game.entities.iterable()) {
  //       const chunkIds = this.getChunkPosAroundPoint(entity.pos);
  //       // console.log("Chunk ids", chunkIds);
  //       chunk: for (const chunkId of chunkIds) {
  //         const isChunkLoaded = this.game.world.hasChunk(chunkId);
  //         if (isChunkLoaded) {
  //           continue chunk;
  //         }
  //
  //         console.log("Generating chunk around player");
  //
  //         const chunk = this.terrainGenerator?.getChunk(chunkId);
  //
  //         if (!chunk) {
  //           console.log("Failed generating chunk", chunkId);
  //           break;
  //         }
  //
  //         this.game.upsertChunk(chunk);
  //
  //         // Only load a single chunk per frame
  //         return;
  //       }
  //     }
  //   }
  // }
}
