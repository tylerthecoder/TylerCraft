import { Vector2D, Vector3D } from "../utils/vector";
import { CONFIG } from "../constants";
import Random from "../utils/random";
import { Chunk } from "./chunk";
import { BLOCKS } from "../blockdata";
import { Cube } from "../entities/cube";
import { IDim } from "../../types";
import { Game } from "../game";


export class TerrainGenerator {

  generateChunk(chunkPos: Vector2D, game: Game) {
    const chunk = new Chunk(chunkPos.data, game);

    const worldPos = chunk.pos;

    for (let i = 0; i < CONFIG.terrain.chunkSize; i++) {
      for (let j = 0; j < CONFIG.terrain.chunkSize; j++) {
        const x = worldPos[0] + i;
        const z = worldPos[2] + j;
        let y: number;
        if (CONFIG.terrain.flatWorld) {
          y = 0
        } else {
          y = Math.floor(Random.noise(x, z) * CONFIG.terrain.maxHeight);
        }

        if (Random.randomNum() > .99) {
          const tree = this.generateTree(new Vector3D([x,y,z]));

          for (const cube of tree) {
            // chunk.addCube(cube);
          }
        }

        for (let k = 0; k <= y; k++) {
          const cubePos = [x, k, z];

          const blockType = k === y ? BLOCKS.grass : BLOCKS.stone;

          const cube = new Cube(blockType, cubePos as IDim);
          chunk.addCube(cube, false);
        }
      }
    }
    return chunk;
  }

  generateTree(startingPos: Vector3D): Cube[] {
    const cubes = [];

    for (let i = 1; i < 5; i++) {
      const newCubePos = startingPos.add(new Vector3D([0,i,0]));
      const cube = new Cube(BLOCKS.wood, newCubePos.data as IDim);
      cubes.push(cube);
    }

    return cubes;
  }

}