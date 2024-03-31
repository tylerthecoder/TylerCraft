import { getBlockData } from "../blockdata.js";
import { Direction, Vector3D } from "../utils/vector.js";
import { faceNumberToFaceVector } from "../utils/face.js";
import { IDim } from "../types.js";
import { Entity, FaceLocater } from "./entity.js";
import { BlockShape, BlockType } from "@craft/rust-world";

export type CubeDto = {
  type: BlockType;
  pos: IDim;
};

export type Cube = {
  type: BlockType;
  pos: Vector3D;
};

export type ISerializedCube = {
  block_type: BlockType;
  extra_data: "None";
  world_pos: { x: number; y: number; z: number };
};

export type WasmCube = {
  block_type: BlockType;
  world_pos: { x: number; y: number; z: number };
  extraData?: { Image: Direction } | "None";
};

export type Box = {
  pos: Vector3D;
  dim?: IDim;
};

export type HitBox = Box & {
  dim: IDim;
  hit?: (entity: Entity, where: FaceLocater) => void;
};

export const CUBE_DIM: IDim = [1, 1, 1];

class CubeHelpersClass {
  fromWasmCube(cube: WasmCube): Cube {
    try {
      return {
        pos: new Vector3D([
          cube.world_pos.x,
          cube.world_pos.y,
          cube.world_pos.z,
        ]),
        type: cube.block_type,
      };
    } catch (err) {
      console.log("Could not create cube from wasm cube", cube, err);
      throw err;
    }
  }

  createCube(type: BlockType, pos: Vector3D) {
    return {
      type,
      pos,
    };
  }

  deserialize(cubeDto: CubeDto): Cube {
    return {
      type: cubeDto.type,
      pos: new Vector3D(cubeDto.pos),
    };
  }

  serialize(cube: Cube): CubeDto {
    return {
      type: cube.type,
      pos: cube.pos.data as IDim,
    };
  }

  isPointInsideOfCube(cube: Cube, point: Vector3D) {
    return cube.pos.data.every((ord, index) => {
      return (
        point.data[index] >= ord && point.data[index] <= ord + CUBE_DIM[index]
      );
    });
  }

  /** Returns an array of positions and directions that cube1 block would obscure
   * cube1 is useful for flat blocks
   */
  getCubeObscuringPositions(cube: Cube): Vector3D[] {
    const blockData = getBlockData(cube.type);

    switch (blockData.shape) {
      case BlockShape.X:
      case BlockShape.Flat:
      case BlockShape.Cube: {
        return Vector3D.unitVectors;
      }

      // case BlockShape.Flat: {
      // const direction = faceNumberToFaceVector(cube.extraData.face);
      // return [direction];
      // }
    }
  }

  isCollide(cube1: Box, cube2: Box): boolean {
    // loop through each dimension. Consider each edge along that dimension a line segmcube2
    // check to see if my (cube1) line segmcube2 overlaps the cube2ities (cube2) line segmcube2
    for (let i = 0; i < 3; i++) {
      if (
        cube1.pos.get(i) <= cube2.pos.get(i) && // cube2 line is front
        cube2.pos.get(i) >= cube1.pos.get(i) + (cube1.dim ?? CUBE_DIM)[i] // and cube2 is not contained in my (cube1) line segmcube2
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false;
      }

      if (
        cube2.pos.get(i) <= cube1.pos.get(i) && // My (cube1) line is front
        cube1.pos.get(i) >= cube2.pos.get(i) + (cube2.dim ?? CUBE_DIM)[i] // and cube2 is not contained in my (cube1) line segmcube2
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false;
      }
    }
    return true;
  }
}

const CubeHelpers = new CubeHelpersClass();
export default CubeHelpers;
