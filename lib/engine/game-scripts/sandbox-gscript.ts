import { CONFIG } from "../config.js";
import { IGameScript } from "../game-script.js";
import { Game } from "../game.js";
import { TerrainGenModule } from "../modules.js";
import { Vector2D, Vector3D } from "../utils/vector.js";
import { World } from "../world/world.js";

// init the terrian gen module and load all chunks around palyer
export class SandboxGScript implements IGameScript {
  static config = {
    seed: "",
    flatWorld: false,
    infinite: false,
  };

  private terrainGenerator: ReturnType<
    typeof TerrainGenModule.getTerrainGenerator
  > | null = null;

  constructor(private game: Game) {}

  async setup(): Promise<void> {
    console.log("Setting up sandbox game script");
    // Load the entire world?
    await TerrainGenModule.load();

    SandboxGScript.config = {
      seed: CONFIG.seed,
      flatWorld: CONFIG.terrain.flatWorld,
      infinite: CONFIG.terrain.infiniteGen,
    };

    const config = SandboxGScript.config;

    this.terrainGenerator = TerrainGenModule.getTerrainGenerator(
      Number(config.seed),
      config.flatWorld
    );

    // Load the chunks around the player
  }

  getChunkPosAroundPoint(pos: Vector3D): Vector2D[] {
    const centerChunkPos = World.worldPosToChunkPos(pos);

    const chunkIds = [];

    for (let i = -CONFIG.loadDistance; i < CONFIG.loadDistance; i++) {
      for (let j = -CONFIG.loadDistance; j < CONFIG.loadDistance; j++) {
        const chunkPos = new Vector2D([
          centerChunkPos.get(0) + i,
          centerChunkPos.get(1) + j,
        ]);
        chunkIds.push(chunkPos);
      }
    }

    return chunkIds;
  }

  update(_delta: number): void {
    if (SandboxGScript.config.infinite) {
      for (const entity of this.game.entities.iterable()) {
        const chunkIds = this.getChunkPosAroundPoint(entity.pos);
        for (const chunkId of chunkIds) {
          const isChunkLoaded = this.game.world.hasChunk(chunkId);
          if (isChunkLoaded) {
            break;
          }

          console.log("Generating chunk around player");

          const chunk = this.terrainGenerator?.getChunk(chunkId);

          if (!chunk) {
            console.log("Failed generating chunk", chunkId);
            break;
          }

          this.game.upsertChunk(chunk);
        }
      }
    }
  }
}
