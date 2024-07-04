import { getBlockData } from "../blockdata.js";
import { Direction, Vector3D } from "../utils/vector.js";
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
}

const CubeHelpers = new CubeHelpersClass();
export default CubeHelpers;
