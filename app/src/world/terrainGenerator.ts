import { Vector2D, Vector3D, Vector } from "../utils/vector";
import { CONFIG } from "../constants";
import Random from "../utils/random";
import { Chunk } from "./chunk";
import { BLOCKS } from "../blockdata";
import { Cube } from "../entities/cube";
import { World } from "./world";
import { serializeCube, deserializeCube, ISerializedCube } from "../serializer";


export interface ISerializedTerrainGenerator {
  blocksToRender: Array<{
    chunkPos: string;
    cubes: ISerializedCube[];
  }>
}

export class TerrainGenerator {
  preRenderedChunks: Set<string> = new Set();

  constructor(
    // take a chunk pos string (1, 2) to a list of cubes that need to be added to it
    private blocksToRender: Map<string, Cube[]> = new Map()
  ) {}

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

  static deserialize(data: ISerializedTerrainGenerator): TerrainGenerator {
    const blocksToRender = data.blocksToRender.map(({chunkPos, cubes}) => {
      return [chunkPos, cubes.map(deserializeCube)] as [string, Cube[]];
    });

    const blocksToRenderMap = new Map(blocksToRender);
    return new TerrainGenerator(blocksToRenderMap);
  }

  addExtraBlock(cube: Cube, world: World) {
    const chunkPos = world.worldPosToChunkPos(cube.pos);

    // this is very strange because we are adding blocks after a chunk as been rendered
    // fixing will take some major engineering
    if (world.hasChunk(chunkPos)) {
      const chunk = world.getChunkFromPos(chunkPos);
      if (!chunk) return;
      // we don't want this to be true
      chunk.addCube(cube)
    }


    const currentBlocks = this.blocksToRender.get(chunkPos.toString()) || [];
    this.blocksToRender.set(chunkPos.toString(), [...currentBlocks, cube]);
  }

  generateChunk(chunkPos: Vector2D, world: World) {
    const chunk = new Chunk(chunkPos);

    const worldPos = chunk.pos.data;

    for (let i = 0; i < CONFIG.terrain.chunkSize; i++) {
      for (let j = 0; j < CONFIG.terrain.chunkSize; j++) {
        const x = worldPos[0] + i;
        const z = worldPos[2] + j;
        const y = CONFIG.terrain.flatWorld ? 0 :
          Math.floor(Random.noise(x, z) * CONFIG.terrain.maxHeight);

        this.preRenderNearbyChunks(chunkPos, world)

        // generate water
        if (y <= CONFIG.terrain.waterLever) {
         for (let k = y; k < 3; k++) {
          const cubePos = [x, k, z];
          const cube = new Cube(BLOCKS.water, new Vector3D(cubePos));
          chunk.addCube(cube);
         }
        }

        for (let k = 0; k <= y; k++) {
          const cubePos = [x, k, z];
          const blockType = k === y ? BLOCKS.grass : Random.randomNum() > .9 ? BLOCKS.gold : BLOCKS.stone;
          const cube = new Cube(blockType, new Vector3D(cubePos));
          chunk.addCube(cube);
        }

        // add grass
        if (y >= CONFIG.terrain.waterLever && Random.randomNum() > .99 && CONFIG.terrain.flowers) {
          const cube = new Cube(BLOCKS.redFlower, new Vector3D([x,y+1,z]));
          chunk.addCube(cube);
        }
      }
    }

    const chunkString = chunkPos.toString();
    if (this.blocksToRender.has(chunkString)){
      this.blocksToRender.get(chunkString)!.forEach(cube => {
        chunk.addCube(cube);
      });
      this.blocksToRender.delete(chunkString);
    }

    return chunk;
  }

  // just go through and generate structures for chunks nearby
  preRenderNearbyChunks(chunkPos: Vector2D, world: World) {
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const indexVector = new Vector2D([i, j]);
        const checkingChunkPos = chunkPos.add(indexVector);
        const worldPos = world.chunkPosToWorldPos(checkingChunkPos);
        if (this.preRenderedChunks.has(checkingChunkPos.toString())) {
          continue;
        }

        if (world.hasChunk(checkingChunkPos)) {
          continue;
        }

        for (let k = 0; k < CONFIG.terrain.chunkSize; k++) {
          for (let l = 0; l < CONFIG.terrain.chunkSize; l++) {
            const y = CONFIG.terrain.flatWorld ? 0 :
              Math.floor(Random.noise(worldPos.get(0) + k, worldPos.get(2) + l) * CONFIG.terrain.maxHeight);
            const blockPos = new Vector3D([
              worldPos.get(0) + k,
              y,
              worldPos.get(2) + l,
            ]);

            if (y > CONFIG.terrain.waterLever && Random.randomNum() > .99 && CONFIG.terrain.trees) {
              const tree = this.generateTree(blockPos);
              for (const cube of tree) {
                this.addExtraBlock(cube, world);
              }
            }

            if (Random.randomNum() > .999) {
              const cloud = this.generateCloud(blockPos);
              for (const cube of cloud) {
                this.addExtraBlock(cube, world);
              }
            }
          }
        }

        this.preRenderedChunks.add(checkingChunkPos.toString())

      }
    }
  }

  generateTree(startingPos: Vector3D): Cube[] {
    const cubes = [];

    // trunk
    for (let i = 1; i <= 5; i++) {
      const newCubePos = startingPos.add(new Vector3D([0,i,0]));
      const cube = new Cube(BLOCKS.wood, newCubePos);
      cubes.push(cube);
    }

    // leafs
    const top = startingPos.add(new Vector3D([0,5,0]));
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

  generateCloud(startingPos: Vector3D): Cube[] {
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
          const newCubePos = cubePos.add(new Vector([0, k, 0]));
          const cube = new Cube(BLOCKS.cloud, newCubePos);
          cubes.push(cube);
        }

      }
    }



    return cubes;
  }

}