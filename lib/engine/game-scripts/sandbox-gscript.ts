import { MovableEntity } from "../entities/moveableEntity.js";
import { GameScript } from "../game-script.js";
import { TerrainGenModule } from "../modules.js";
import { Vector2D, Vector3D } from "../utils/vector.js";
import { World } from "../world/world.js";

interface Config {
  seed: string;
  flatWorld: boolean;
  infinite: boolean;
  loadDistance: number;
}

// await WorldModule.load();
// const game = WorldModule.createGame();
// const player = WorldModule.createPlayer(Number(1));
// game.addPlayer(player);

// init the terrian gen module and load all chunks around palyer
export class SandboxGScript extends GameScript<Config> {
  name = "sandbox";

  public config = {
    seed: "",
    flatWorld: false,
    infinite: false,
    loadDistance: 3,
  };

  private terrainGenerator: ReturnType<
    typeof TerrainGenModule.getTerrainGenerator
  > | null = null;

  async setup(): Promise<void> {
    console.log("Setting up sandbox game script");
    // Load the entire world?
    await TerrainGenModule.load();

    this.config = {
      seed: this.game.config.seed,
      flatWorld: this.game.config.terrain.flatWorld,
      infinite: this.game.config.terrain.infiniteGen,
      loadDistance: this.game.config.loadDistance,
    };

    this.terrainGenerator = TerrainGenModule.getParkorTerrainGenerator(
      Number(this.config.seed)
    );

    // Load the chunks around the player
  }

  setConfig(config: Config): void {
    this.config = config;

    // TODO: Update the terrain generator's config
  }

  getChunkPosAroundPoint(pos: Vector3D): Vector2D[] {
    const centerChunkPos = World.worldPosToChunkPos(pos);

    const chunkIds = [];
    const loadDistance = this.config.loadDistance;

    for (let i = -loadDistance; i < loadDistance; i++) {
      for (let j = -loadDistance; j < loadDistance; j++) {
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
    for (const entity of this.game.entities.iterable()) {
      // Prevent from falling out of the world
      if (entity.pos.get(1) < -10) {
        entity.pos.set(1, 30);
        if (entity instanceof MovableEntity) {
          entity.vel.set(1, -0.1);
        }
      }

      if (this.config.infinite) {
        const chunkIds = this.getChunkPosAroundPoint(entity.pos);
        // console.log("Chunk ids", chunkIds);
        chunk: for (const chunkId of chunkIds) {
          const isChunkLoaded = this.game.world.hasChunk(chunkId);
          if (isChunkLoaded) {
            continue chunk;
          }

          console.log("Generating chunk around player");

          const chunk = this.terrainGenerator?.getChunk(chunkId);

          if (!chunk) {
            console.log("Failed generating chunk", chunkId);
            break;
          }

          this.game.upsertChunk(chunk);

          // Only load a single chunk per frame
          return;
        }
      }
    }
  }
}
