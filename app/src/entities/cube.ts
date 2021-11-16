import { Entity, FaceLocater } from "./entity";
import { IDim } from "../types";
import { BLOCKS, BlockType, ExtraBlockData, getBlockData } from "../blockdata";
import { Vector3D } from "../utils/vector";
import { faceNumberToFaceVector, faceVectorToFaceNumber, getOppositeCubeFace } from "../utils/face";
import { World } from "../world/world";

export class Cube extends Entity {

  constructor(
    public type: BLOCKS,
    public pos: Vector3D,
    public extraData?: ExtraBlockData,
  ) {
    super();
  }

  update(_delta: number) {/* NO_OP */ }

  hit(_ent: Entity, _where: FaceLocater) {/* NO-OP */ }

  // isPointInsideMe(point: IDim) {
  //   return this.pos.data.every((ord, index) => {
  //     return point[index] >= ord && point[index] <= ord + this.dim[index]
  //   });
  // }
}



export function isPointInsideOfCube(cube: Cube, point: Vector3D) {
  return cube.pos.data.every((ord, index) => {
    return point.data[index] >= ord && point.data[index] <= ord + cube.dim[index]
  });
}


/**
 * Interface to locate any block's
 */
interface IBlockFaceLocator {
  position: Vector3D;
  direction: Vector3D;
}


/** Returns an array of positions and directions that this block would obscure
 * This is useful for flat blocks
 */
export function getCubeObscuringPositions(cube: Cube): Vector3D[] {
  const blockData = getBlockData(cube.type);

  switch (blockData.blockType) {
    case BlockType.fluid:
    case BlockType.x:
    case BlockType.cube: {
      return Vector3D.unitVectors;
      // return Vector3D.unitVectors.map(dir => (
      //   {
      //     direction: dir,
      //     position: cube.pos.add(dir),
      //   }
      // ));
    }

    case BlockType.flat: {
      console.log(cube);
      if (!cube.extraData) throw new Error("This block should have extra data");
      const direction = faceNumberToFaceVector(cube.extraData.face)
      return [direction];
      // return [{
      //   position: cube.pos.add(vec)
      // }]
    }

    // case BlockType.flat: {
    //   if (!cube.extraData) throw new Error("This block should have extra data");
    //   const ret: IBlockFaceLocator[] = []
    //   const direction = faceNumberToFaceVector(cube.extraData.face)
    //   for (let i = 0; i < cube.dim[0]; i++) {
    //     for (let j = 0; j < cube.dim[1]; j++) {
    //       for (let k = 0; k < cube.dim[2]; k++) {
    //         ret.push({
    //           position: new Vector3D([i, j, k]).add(cube.pos).add(direction),
    //           direction: faceNumberToFaceVector(getOppositeCubeFace(cube.extraData.face)),
    //         });
    //       }
    //     }
    //   }
    //   return ret;
    // }
  }
}

export function isCubeFaceVisible(cube: Cube, world: World, direction: Vector3D) {
  const checkingBlockPosition = cube.pos.add(direction);

  // This is outside of the world, so we don't have to show this face
  if (checkingBlockPosition.get(1) < 0) return true;

  const checkingBlock = world.getBlockFromWorldPoint(checkingBlockPosition);
  // There isn't a block, so we should show the face
  if (checkingBlock === null) return true;

  const blockData = getBlockData(checkingBlock.type);
  const currentBlockData = getBlockData(cube.type);

  if (blockData.blockType === BlockType.fluid && currentBlockData.blockType === BlockType.fluid) {
    return true;
  }

  if (blockData.blockType === BlockType.flat && checkingBlock.extraData) {
    const faceIndex = faceVectorToFaceNumber(direction);
    if (faceIndex !== checkingBlock.extraData.face) {
      return false;
    }
  }

  if (blockData.transparent) {
    return false;
  }

  return true;
}