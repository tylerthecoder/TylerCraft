import { Cube } from "../entities/cube.js";
import { CONFIG } from "../config.js";
import { Vector3D, Vector2D, Direction } from "../utils/vector.js";
import { BlockType } from "../blockdata.js";
import { WorldModuleTypes } from "../modules.js";
export interface ILookingAtData {
  cube: Cube;
  face: Direction;
  dist: number;
}

export interface ISerializedChunk {
  position: {
    x: number;
    y: number;
  };
  blocks: BlockType[];
  block_data: Map<string, "None" | { Image: string }>;
  chunkId: string;
}

export type ISerializedVisibleFaces = Array<{
  world_pos: { x: 0; y: 0; z: 0 };
  faces: [boolean, boolean, boolean, boolean, boolean, boolean];
}>;

export class Chunk {
  uid: string;

  constructor(
    private wasmChunk: WorldModuleTypes.Chunk,
    public pos: Vector2D,
    data?: ISerializedChunk
  ) {
    this.uid = pos.toIndex();

    if (data) {
      this.set(data);
    }
  }

  serialize(): ISerializedChunk {
    const data = this.wasmChunk.serialize() as ISerializedChunk;
    data.chunkId = this.uid;
    return data;
  }

  set(data: ISerializedChunk) {
    this.wasmChunk.set(data);
  }

  addBlock(block: Cube) {
    const wasmBlock = {
      block_type: block.type,
      extra_data: "None",
      world_pos: {
        x: block.pos.get(0),
        y: block.pos.get(1),
        z: block.pos.get(2),
      },
    };
    this.wasmChunk.add_block_wasm(wasmBlock);
  }

  getBlockData(pos: Vector3D) {
    const block = this.wasmChunk.get_block_wasm(
      pos.toCartIntObj()
    ) as Cube;
    return block.extraData;
  }

  containsWorldPos(worldPos: Vector3D) {
    // scale cubes position by chunk size
    const scaledPos = worldPos.data.map((dim) =>
      Math.floor(dim / CONFIG.terrain.chunkSize)
    );
    return scaledPos[0] === this.pos.get(0) && scaledPos[2] === this.pos.get(1);
  }

  circleIntersect(circlePos: Vector3D, radius: number): boolean {
    const testCords = circlePos.copy();

    // find the closest faces to the circle and set the test cords to them
    for (let i = 0; i < 3; i++) {
      if (i === 1) continue; // only run for x and z
      if (circlePos.get(i) < this.pos.get(i)) {
        testCords.set(i, this.pos.get(i));
      } else if (
        circlePos.get(i) >
        this.pos.get(i) + CONFIG.terrain.chunkSize
      ) {
        testCords.set(i, this.pos.get(i) + CONFIG.terrain.chunkSize);
      }
    }

    const dist = testCords.distFrom(circlePos);

    return dist <= radius;
  }

  // pass an entity and I'll push it out of me :)
  // pushOut(ent: Entity | Cube) {

  //   const entDim = ent instanceof Entity ? ent.dim : CUBE_DIM;

  //   const ifCubeExistThenPushOut = (pos: Vector3D) => {
  //     pos.data = pos.data.map(Math.floor);

  //     const cube = this.blocks.get(pos);
  //     if (!cube) return;

  //     const cubeData = BLOCK_DATA.get(cube.type)!;

  //     if (!CubeHelpers.isCollide(cube, ent)) return;
  //     if (!cubeData) return;
  //     if (cubeData.intangible) return;

  //     if (ent instanceof Entity) {
  //       ent.pushOut(cube);
  //     }
  //   }

  //   // check the edges of the ent to see if it is intersecting the cubes
  //   for (let x = 0; x < entDim[0]; x++) {
  //     const centerX = x + .5;
  //     for (let y = 0; y < entDim[1]; y++) {
  //       const centerY = y + .5;
  //       for (let z = 0; z < entDim[2]; z++) {
  //         const centerZ = z + .5;
  //         const center = ent.pos.add(new Vector3D([centerX, centerY, centerZ]));

  //         // check the unit vectors first
  //         for (const vec of Vector3D.unitVectors) {
  //           const checkingPos = center.add(vec);
  //           ifCubeExistThenPushOut(checkingPos);
  //         }

  //         for (const vec of Vector3D.edgeVectors) {
  //           const checkingPos = center.add(vec);
  //           ifCubeExistThenPushOut(checkingPos);
  //         }

  //         for (const vec of Vector3D.cornerVectors) {
  //           const checkingPos = center.add(vec);
  //           ifCubeExistThenPushOut(checkingPos);
  //         }
  //       }
  //     }
  //   }
  // }
}
