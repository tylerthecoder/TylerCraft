import { Vector2D, Vector3D } from "../utils/vector";
import { CONFIG } from "../config";
import Random from "../utils/random";
import { Chunk } from "./chunk";
import { BLOCKS } from "../blockdata";
import { Cube } from "../entities/cube";
import { World } from "./world";
import { serializeCube, deserializeCube, ISerializedCube } from "../serializer";
import { BiomeGenerator, Biome } from "./biome";

export interface ISerializedTerrainGenerator {
  blocksToRender: Array<{
    chunkPos: string;
    cubes: ISerializedCube[];
  }>
}

export class TerrainGenerator {
  private blocksToRender: Map<string, Cube[]>
  public biomeGenerator = new BiomeGenerator();
  preRenderedChunks: Set<string> = new Set();

  constructor(
    private worldHasChunk: (chunkPos: Vector2D) => boolean,
    private worldGetChunk: (chunkPos: Vector2D) => Chunk | undefined,
    // take a chunk pos string (1, 2) to a list of cubes that need to be added to it
    serializedData?: ISerializedTerrainGenerator,
  ) {
    if (serializedData) {
      const blocksToRender = serializedData.blocksToRender.map(({ chunkPos, cubes }) => {
        return [chunkPos, cubes.map(deserializeCube)] as [string, Cube[]];
      });

      this.blocksToRender = new Map(blocksToRender);
    } else {
      this.blocksToRender = new Map();
    }

  }

  serialize(): ISerializedTerrainGenerator {
    return {
      blocksToRender: Array.from(this.blocksToRender.entries()).map(([chunkPos, cubes]) => {
        return {
          chunkPos,
          cubes: cubes.map(cube => serializeCube(cube))
        }
      }),
    }
  }

  private addExtraBlock(cube: Cube) {
    const chunkPos = World.worldPosToChunkPos(cube.pos);

    // this is very strange because we are adding blocks after a chunk as been rendered
    // fixing will take some major engineering
    if (this.worldHasChunk(chunkPos)) {
      const chunk = this.worldGetChunk(chunkPos);
      if (!chunk) return;
      // we don't want this to be true
      chunk.blocks.add(cube)
    }

    const currentBlocks = this.blocksToRender.get(chunkPos.toIndex()) || [];
    this.blocksToRender.set(chunkPos.toIndex(), [...currentBlocks, cube]);
  }

  private getHeightFromPos(pos: Vector2D): number {
    const biomeHeight = this.biomeGenerator.getBiomeHeightForWorldPos(pos);

    if (CONFIG.terrain.flatWorld) return 0

    return Math.floor(Random.noise(pos.data[0], pos.data[1]) * biomeHeight);
  }

  generateChunk(chunkPos: Vector2D): Chunk {
    const chunk = new Chunk(chunkPos);

    const worldPos = chunk.pos.data;

    // we need to make this into phases more
    // Phase 1, Generate bare terrain

    for (let i = 0; i < CONFIG.terrain.chunkSize; i++) {
      for (let j = 0; j < CONFIG.terrain.chunkSize; j++) {
        const x = worldPos[0] + i;
        const z = worldPos[2] + j;

        const pos = new Vector2D([x, z]);

        const y = this.getHeightFromPos(pos);
        const biome = this.biomeGenerator.getBiomeFromWorldPos(pos);

        this.preRenderNearbyChunks(chunkPos);

        // generate water
        if (y <= CONFIG.terrain.waterLever) {
          for (let k = y; k < 3; k++) {
            const cubePos = [x, k, z];
            const cube = new Cube(BLOCKS.water, new Vector3D(cubePos));
            chunk.blocks.add(cube);
          }
        }

        for (let k = 0; k <= y; k++) {
          const cubePos = [x, k, z];
          const topBlock = biome === Biome.Forest ? BLOCKS.wood :
            biome === Biome.Mountain ? BLOCKS.stone :
              biome === Biome.Plains ? BLOCKS.grass : BLOCKS.gold;

          const blockType = k === y ? topBlock : Random.randomNum() > .9 ? BLOCKS.gold : BLOCKS.stone;
          const cube = new Cube(blockType, new Vector3D(cubePos));
          chunk.blocks.add(cube);
        }

        // add grass
        if (y >= CONFIG.terrain.waterLever && Random.randomNum() > .99 && CONFIG.terrain.flowers) {
          const cube = new Cube(BLOCKS.redFlower, new Vector3D([x, y + 1, z]));
          chunk.blocks.add(cube);
        }
      }
    }

    const chunkString = chunkPos.toIndex();
    if (this.blocksToRender.has(chunkString)) {
      this.blocksToRender.get(chunkString)!.forEach(cube => {
        chunk.blocks.add(cube);
      });
      this.blocksToRender.delete(chunkString);
    }

    chunk.blocks.add(new Cube(BLOCKS.cloud, new Vector3D([0, 0, 0])));
    chunk.blocks.add(new Cube(BLOCKS.cloud, new Vector3D([0, 0, 15])));
    chunk.blocks.add(new Cube(BLOCKS.cloud, new Vector3D([15, 0, 15])));
    chunk.blocks.add(new Cube(BLOCKS.cloud, new Vector3D([15, 0, 0])));

    return chunk;
  }

  // just go through and generate structures for chunks nearby
  private preRenderNearbyChunks(chunkPos: Vector2D) {
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const indexVector = new Vector2D([i, j]);
        const checkingChunkPos = chunkPos.add(indexVector);
        const worldPos = World.chunkPosToWorldPos(checkingChunkPos);

        if (this.preRenderedChunks.has(checkingChunkPos.toIndex())) {
          continue;
        }

        if (this.worldHasChunk(checkingChunkPos)) {
          continue;
        }

        for (let k = 0; k < CONFIG.terrain.chunkSize; k++) {
          for (let l = 0; l < CONFIG.terrain.chunkSize; l++) {
            const pos = new Vector2D([k, l]);

            const y = this.getHeightFromPos(pos);

            const blockPos = new Vector3D([
              worldPos.get(0) + k,
              y,
              worldPos.get(2) + l,
            ]);

            const biome = this.biomeGenerator.getBiomeFromWorldPos(blockPos.stripY());

            // Tree logic
            switch (biome) {
              case Biome.Forest:
                // Make tress very likely
                if (Random.randomNum() > .95 && CONFIG.terrain.trees) {
                  const tree = this.generateTree(blockPos);
                  for (const cube of tree) {
                    this.addExtraBlock(cube);
                  }
                }
                break;
              case Biome.Mountain:

                break;

              case Biome.Plains:
                if (y > CONFIG.terrain.waterLever && Random.randomNum() > .999 && CONFIG.terrain.trees) {
                  const tree = this.generateTree(blockPos);
                  for (const cube of tree) {
                    this.addExtraBlock(cube);
                  }
                }

                break;
            }

            // Cloud Logic
            if (Random.randomNum() > .999) {
              const cloud = this.generateCloud(blockPos);
              for (const cube of cloud) {
                this.addExtraBlock(cube);
              }
            }
          }
        }

        this.preRenderedChunks.add(checkingChunkPos.toIndex())

      }
    }
  }

  private generateTree(startingPos: Vector3D): Cube[] {
    const cubes = [];

    // trunk
    for (let i = 1; i <= 5; i++) {
      const newCubePos = startingPos.add(new Vector3D([0, i, 0]));
      const cube = new Cube(BLOCKS.wood, newCubePos);
      cubes.push(cube);
    }

    // leafs
    const top = startingPos.add(new Vector3D([0, 5, 0]));
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          const indexVector = new Vector3D([i, j, k]);
          const newPos = top.add(indexVector);
          if (
            i === 0 && j === 0 && k === 0 ||
            i === 0 && j == -1 && k === 0
          ) {
            continue;
          }
          const cube = new Cube(BLOCKS.leaf, newPos);
          cubes.push(cube);
        }
      }
    }


    return cubes;
  }

  private generateCloud(startingPos: Vector3D): Cube[] {
    startingPos.set(1, CONFIG.terrain.cloudLevel);
    const cubes = [];

    const width = Random.randomInt(2, 6);
    const length = Random.randomInt(5, 10);

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < length; j++) {
        const indexVec = new Vector3D([i, 0, j]);
        const cubePos = startingPos.add(indexVec);
        const y = Math.floor(Random.customNoise(cubePos.get(0), cubePos.get(2), 4) * 4);
        if (y < 1) {
          continue;
        }

        for (let k = 0; k <= y; k++) {
          const newCubePos = cubePos.add(new Vector3D([0, k, 0]));
          const cube = new Cube(BLOCKS.cloud, newCubePos);
          cubes.push(cube);
        }

      }
    }



    return cubes;
  }

}