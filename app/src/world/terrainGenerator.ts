import { Vector2D, Vector3D, Vector } from "../utils/vector";
import { CONFIG } from "../constants";
import Random from "../utils/random";
import { Chunk } from "./chunk";
import { BLOCKS } from "../blockdata";
import { Cube } from "../entities/cube";
import { IDim } from "../../types";
import { Game } from "../game";
import { World } from "./world";


export class TerrainGenerator {

  // take a chunk pos string (1, 2) to a list of cubes that need to be added to it
  // TODO put this in the game save data
  blocksToRender: Map<string, Cube[]> = new Map();
  preRenderedChunks: Set<string> = new Set();

  addExtraBlock(cube: Cube, world: World) {
    const chunkPos = world.worldPosToChunkPos(new Vector3D(cube.pos));

    // this is very strange because we are adding blocks after a chunk as been rendered
    // fixing will take some major engineering
    if (world.chunks.has(chunkPos.toString())) {
      const chunk = world.chunks.get(chunkPos.toString());
      // we don't want this to be true
      chunk.addCube(cube)
    }


    const currentBlocks = this.blocksToRender.get(chunkPos.toString()) || [];
    this.blocksToRender.set(chunkPos.toString(), [...currentBlocks, cube]);
  }

  generateChunk(chunkPos: Vector2D, world: World) {
    const chunk = new Chunk(chunkPos);

    const worldPos = chunk.pos;

    for (let i = 0; i < CONFIG.terrain.chunkSize; i++) {
      for (let j = 0; j < CONFIG.terrain.chunkSize; j++) {
        const x = worldPos[0] + i;
        const z = worldPos[2] + j;
        const y = CONFIG.terrain.flatWorld ? 0 :
          Math.floor(Random.noise(x, z) * CONFIG.terrain.maxHeight);

        this.preRenderNearbyChunks(chunkPos, world)

        for (let k = 0; k <= y; k++) {
          const cubePos = [x, k, z];

          const blockType = k === y ? BLOCKS.grass : BLOCKS.stone;

          const cube = new Cube(blockType, new Vector3D(cubePos));
          chunk.addCube(cube);
        }

        // add grass
        if (Random.randomNum() > .99) {
          const cube = new Cube(BLOCKS.redFlower, new Vector3D([x,y+1,z]));
          chunk.addCube(cube);
        }
      }
    }

    const chunkString = chunkPos.toString();
    if (this.blocksToRender.has(chunkString)){
      this.blocksToRender.get(chunkString).forEach(cube => {
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

        if (world.chunks.has(checkingChunkPos.toString())) {
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

            if (Random.randomNum() > .99) {
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