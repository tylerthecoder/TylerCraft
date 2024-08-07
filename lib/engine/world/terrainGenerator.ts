import { Vector2D, Vector3D } from "../utils/vector.js";
import { CONFIG } from "../config.js";
import { Random } from "../utils/random.js";
import CubeHelpers, { Cube } from "../entities/cube.js";
import { World } from "./world.js";
import { BiomeGenerator, Biome } from "./biome.js";
import { WorldModule } from "../modules.js";
import { BlockType } from "@craft/rust-world";
import { ISerializedChunk } from "./index.js";

// export interface ISerializedTerrainGenerator {
//   blocksToRender: Array<{
//     chunkPos: string;
//     cubes: Cube[];
//   }>;
// }
//
// export class TerrainGenerator {
//   private blocksToRender: Map<string, Cube[]>;
//   public biomeGenerator = new BiomeGenerator();
//   preRenderedChunks: Set<string> = new Set();
//
//   constructor(
//     private worldHasChunk: (chunkPos: Vector2D) => boolean,
//     private worldGetChunk: (chunkPos: Vector2D) => ISerializedChunk | undefined,
//     // take a chunk pos string (1, 2) to a list of cubes that need to be added to it
//     serializedData?: ISerializedTerrainGenerator
//   ) {
//     if (serializedData) {
//       const blocksToRender = serializedData.blocksToRender.map(
//         ({ chunkPos, cubes }) => {
//           return [chunkPos, cubes] as [string, Cube[]];
//         }
//       );
//
//       this.blocksToRender = new Map(blocksToRender);
//     } else {
//       this.blocksToRender = new Map();
//     }
//   }
//
//   serialize(): ISerializedTerrainGenerator {
//     return {
//       blocksToRender: Array.from(this.blocksToRender.entries()).map(
//         ([chunkPos, cubes]) => {
//           return {
//             chunkPos,
//             cubes,
//           };
//         }
//       ),
//     };
//   }
//
//   private addExtraBlock(cube: Cube) {
//     const chunkPos = World.worldPosToChunkPos(cube.pos);
//
//     // this is very strange because we are adding blocks after a chunk as been rendered
//     // fixing will take some major engineering
//     if (this.worldHasChunk(chunkPos)) {
//       const chunk = this.worldGetChunk(chunkPos);
//       if (!chunk) return;
//       // we don't want this to be true
//       chunk.addBlock(cube);
//     }
//
//     const currentBlocks = this.blocksToRender.get(chunkPos.toIndex()) || [];
//     this.blocksToRender.set(chunkPos.toIndex(), [...currentBlocks, cube]);
//   }
//
//   private getHeightFromPos(pos: Vector2D): number {
//     const biomeHeight = this.biomeGenerator.getBiomeHeightForWorldPos(pos);
//
//     if (CONFIG.terrain.flatWorld) return 0;
//
//     return Math.floor(Random.noise(pos.data[0], pos.data[1]) * biomeHeight);
//   }
//
//   private getTopBlock(biome: Biome): BlockType {
//     if (biome === Biome.Forest) {
//       return BlockType.Grass;
//     }
//     if (biome === Biome.Mountain) {
//       if (Random.randomFloat(0, 1) > 0.5) {
//         return BlockType.Stone;
//       } else {
//         return BlockType.Grass;
//       }
//     }
//     if (biome === Biome.Plains) {
//       return BlockType.Grass;
//     }
//     return BlockType.Grass;
//   }
//
//   generateChunk(chunkPos: Vector2D): Chunk {
//     const chunk = WorldModule.createChunk(chunkPos);
//
//     const worldPos = World.chunkPosToWorldPos(chunkPos).data;
//
//     // we need to make this into phases more
//     // Phase 1, Generate bare terrain
//
//     for (let i = 0; i < CONFIG.terrain.chunkSize; i++) {
//       for (let j = 0; j < CONFIG.terrain.chunkSize; j++) {
//         const x = worldPos[0] + i;
//         const z = worldPos[2] + j;
//
//         const pos = new Vector2D([x, z]);
//
//         const y = this.getHeightFromPos(pos);
//         const biome = this.biomeGenerator.getBiomeFromWorldPos(pos);
//
//         this.preRenderNearbyChunks(chunkPos);
//
//         // generate water
//         if (y <= CONFIG.terrain.waterLever) {
//           for (let k = y; k < 3; k++) {
//             const cubePos = [x, k, z];
//             const cube = CubeHelpers.createCube(
//               BlockType.Water,
//               new Vector3D(cubePos)
//             );
//             chunk.addBlock(cube);
//           }
//         }
//
//         for (let k = 0; k <= y; k++) {
//           const cubePos = [x, k, z];
//
//           const topBlock = this.getTopBlock(biome);
//
//           const blockType =
//             k === y
//               ? topBlock
//               : Random.randomNum() > 0.9
//               ? BlockType.Gold
//               : BlockType.Stone;
//           const cube = CubeHelpers.createCube(blockType, new Vector3D(cubePos));
//           chunk.addBlock(cube);
//         }
//
//         // add grass
//         if (
//           y >= CONFIG.terrain.waterLever &&
//           Random.randomNum() > 0.99 &&
//           CONFIG.terrain.flowers
//         ) {
//           const cube = CubeHelpers.createCube(
//             BlockType.RedFlower,
//             new Vector3D([x, y + 1, z])
//           );
//           chunk.addBlock(cube);
//         }
//       }
//     }
//
//     const chunkString = chunkPos.toIndex();
//     if (this.blocksToRender.has(chunkString)) {
//       this.blocksToRender.get(chunkString)?.forEach((cube) => {
//         chunk.addBlock(cube);
//       });
//       this.blocksToRender.delete(chunkString);
//     }
//
//     chunk.addBlock(
//       CubeHelpers.createCube(BlockType.Cloud, new Vector3D([0, 0, 0]))
//     );
//     chunk.addBlock(
//       CubeHelpers.createCube(BlockType.Cloud, new Vector3D([0, 0, 15]))
//     );
//     chunk.addBlock(
//       CubeHelpers.createCube(BlockType.Cloud, new Vector3D([15, 0, 15]))
//     );
//     chunk.addBlock(
//       CubeHelpers.createCube(BlockType.Cloud, new Vector3D([15, 0, 0]))
//     );
//
//     return chunk;
//   }
//
//   // just go through and generate structures for chunks nearby
//   private preRenderNearbyChunks(chunkPos: Vector2D) {
//     for (let i = -2; i <= 2; i++) {
//       for (let j = -2; j <= 2; j++) {
//         const indexVector = new Vector2D([i, j]);
//         const checkingChunkPos = chunkPos.add(indexVector);
//         const worldPos = World.chunkPosToWorldPos(checkingChunkPos);
//
//         if (this.preRenderedChunks.has(checkingChunkPos.toIndex())) {
//           continue;
//         }
//
//         if (this.worldHasChunk(checkingChunkPos)) {
//           continue;
//         }
//
//         for (let k = 0; k < CONFIG.terrain.chunkSize; k++) {
//           for (let l = 0; l < CONFIG.terrain.chunkSize; l++) {
//             const pos = new Vector2D([k, l]);
//
//             const y = this.getHeightFromPos(pos);
//
//             const blockPos = new Vector3D([
//               worldPos.get(0) + k,
//               y,
//               worldPos.get(2) + l,
//             ]);
//
//             const biome = this.biomeGenerator.getBiomeFromWorldPos(
//               blockPos.stripY()
//             );
//
//             // Tree logic
//             switch (biome) {
//               case Biome.Forest:
//                 // Make tress very likely
//                 if (Random.randomNum() > 0.95 && CONFIG.terrain.trees) {
//                   const tree = this.generateTree(blockPos);
//                   for (const cube of tree) {
//                     this.addExtraBlock(cube);
//                   }
//                 }
//                 break;
//               case Biome.Mountain:
//                 break;
//
//               case Biome.Plains:
//                 if (
//                   y > CONFIG.terrain.waterLever &&
//                   Random.randomNum() > 0.999 &&
//                   CONFIG.terrain.trees
//                 ) {
//                   const tree = this.generateTree(blockPos);
//                   for (const cube of tree) {
//                     this.addExtraBlock(cube);
//                   }
//                 }
//
//                 break;
//             }
//
//             // Cloud Logic
//             if (Random.randomNum() > 0.999) {
//               const cloud = this.generateCloud(blockPos);
//               for (const cube of cloud) {
//                 this.addExtraBlock(cube);
//               }
//             }
//           }
//         }
//
//         this.preRenderedChunks.add(checkingChunkPos.toIndex());
//       }
//     }
//   }
//
//   private generateTree(startingPos: Vector3D): Cube[] {
//     const cubes = [];
//
//     // trunk
//     for (let i = 1; i <= 5; i++) {
//       const newCubePos = startingPos.add(new Vector3D([0, i, 0]));
//       const cube = CubeHelpers.createCube(BlockType.Wood, newCubePos);
//       cubes.push(cube);
//     }
//
//     // leafs
//     const top = startingPos.add(new Vector3D([0, 5, 0]));
//     for (let i = -1; i <= 1; i++) {
//       for (let j = -1; j <= 1; j++) {
//         for (let k = -1; k <= 1; k++) {
//           const indexVector = new Vector3D([i, j, k]);
//           const newPos = top.add(indexVector);
//           if (
//             (i === 0 && j === 0 && k === 0) ||
//             (i === 0 && j == -1 && k === 0)
//           ) {
//             continue;
//           }
//           const cube = CubeHelpers.createCube(BlockType.Leaf, newPos);
//           cubes.push(cube);
//         }
//       }
//     }
//
//     return cubes;
//   }
//
//   private generateCloud(startingPos: Vector3D): Cube[] {
//     startingPos.set(1, CONFIG.terrain.cloudLevel);
//     const cubes = [];
//
//     const width = Random.randomInt(2, 6);
//     const length = Random.randomInt(5, 10);
//
//     for (let i = 0; i < width; i++) {
//       for (let j = 0; j < length; j++) {
//         const indexVec = new Vector3D([i, 0, j]);
//         const cubePos = startingPos.add(indexVec);
//         const y = Math.floor(
//           Random.customNoise(cubePos.get(0), cubePos.get(2), 4) * 4
//         );
//         if (y < 1) {
//           continue;
//         }
//
//         for (let k = 0; k <= y; k++) {
//           const newCubePos = cubePos.add(new Vector3D([0, k, 0]));
//           const cube = CubeHelpers.createCube(BlockType.Cloud, newCubePos);
//           cubes.push(cube);
//         }
//       }
//     }
//
//     return cubes;
//   }
// }
