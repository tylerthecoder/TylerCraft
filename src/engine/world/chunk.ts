import CubeHelpers, { Cube, CUBE_DIM } from "../entities/cube.js";
import { IDim } from "../types.js";
import { arrayMul, arrayAdd, arrayDot, arrayScalarMul, roundToNPlaces, arrayDistSquared } from "../utils.js";
import { CONFIG } from "../config.js";
import { Vector3D, Vector2D, Direction } from "../utils/vector.js";
import { BlockType } from "../blockdata.js";
import { ICameraData } from "../camera.js";
import { faceVectorToFaceNumber, getOppositeCubeFace } from "../utils/face.js";
import { World } from "./world.js";
import WasmWorld from "@craft/rust-world"



export interface ILookingAtData {
  newCubePos: Vector3D,
  cube?: Cube,
  // The face number (0 - 5) that is being looked at
  face: number;
  dist: number;
}

// type SerializedVisibleData = Array<[pos: string, visible: Array<IDim>]>;

export interface ISerializedChunk {
  chunkPos: Vector2D,
  cubes: BlockType[],
  block_data: Record<string, 'None' | { Image: string }>
  // chunkId: string;
  // vis: SerializedVisibleData,
}



export type ISerializedVisibleFaces = Array<{
  pos: { x: 0, y: 0, z: 0 },
  faces: [boolean, boolean, boolean, boolean, boolean, boolean]
}>

export class Chunk {
  // private blocks: BlockHolder;
  visibleCubesFaces: Array<{
    cube: Cube,
    faceVectors: Vector3D[],
  }>

  uid: string;

  constructor(
    private world: World,
    private wasmWorld: WasmWorld.World,
    private pos: Vector2D
  ) {
    this.uid = pos.toIndex();

    // this.blocks = new BlockHolder(this);
    this.visibleCubesFaces = [];
  }

  serialize(): ISerializedChunk {
    return this.wasmWorld.serialize_chunk(this.pos.get(0), this.pos.get(1))
  }

  set(data: ISerializedChunk) {
    this.wasmWorld.set_chunk_at_pos(data);
    // this.blocks = BlockHolder.deserialize(data.cubes, this);
  }

  // getBlock(pos: Vector3D): Cube {
  //   return this.chunk.

  //   return this.blocks.get(pos);
  // }


  // static deserialize(chunkData: ISerializedChunk) {
  //   const chunkPos = Vector2D.fromIndex(chunkData.chunkPos);

  //   const chunk = new Chunk(chunkPos);
  //   chunk.blocks = BlockHolder.deserialize(chunkData.cubes, chunk);

  //   return chunk;
  // }


  circleIntersect(circlePos: Vector3D, radius: number): boolean {
    const testCords = circlePos.copy();

    // find the closest faces to the circle and set the test cords to them
    for (let i = 0; i < 3; i++) {
      if (i === 1) continue; // only run for x and z
      if (circlePos.get(i) < this.pos.get(i)) {
        testCords.set(i, this.pos.get(i));
      } else if (circlePos.get(i) > this.pos.get(i) + CONFIG.terrain.chunkSize) {
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

  containsWorldPos(worldPos: Vector3D) {
    // scale cubes position by chunk size
    const scaledPos = worldPos.data.map(dim => Math.floor(dim / CONFIG.terrain.chunkSize));
    return scaledPos[0] === this.pos.get(0) && scaledPos[2] === this.pos.get(1);
  }

  calculateVisibleFaces(world: World) {
    // const visibleCubePosMap = new Map<string, { cube: Cube, faceVectors: Vector3D[] }>();

    // const addVisibleFace = (cube: Cube, directionVector: Vector3D) => {
    //   const visibleCubePos =
    //     visibleCubePosMap.get(cube.pos.toIndex()) ??
    //     {
    //       cube: cube,
    //       faceVectors: []
    //     };

    //   visibleCubePos.faceVectors.push(directionVector);
    //   visibleCubePosMap.set(cube.pos.toIndex(), visibleCubePos);
    // }

    // this.blocks.iterate(cube => {
    //   CubeHelpers.getCubeObscuringPositions(cube)
    //     .filter(direction => CubeHelpers.isCubeFaceVisible(cube, world, direction))
    //     .forEach(direction => addVisibleFace(cube, direction));
    // });

    // this.visibleCubesFaces = Array.from(visibleCubePosMap.values());

    // const faces


    const faces = this.wasmWorld.get_chunk_visible_faces(this.pos.get(0), this.pos.get(1)) as ISerializedVisibleFaces;

    // convert to real faces

    this.visibleCubesFaces = faces.map(face => ({
      cube: this.world.getBlockFromWorldPoint(new Vector3D([face.pos.x, face.pos.y, face.pos.z]))!,
      faceVectors: (Object.values(Direction) as Direction[]).filter((_dir, index) => face.faces[index]).map(Vector3D.fromDirection)
    }));

  }

  lookingAt(camera: ICameraData): ILookingAtData | false {
    let firstIntersection: IDim;

    const cameraPos = camera.pos;
    const cameraDir = new Vector3D(camera.rotCart).multiply(new Vector3D([1, -1, 1])).data;

    // [dist, newCubePos( a vector, when added to the cubes pos, gives you the pos of a new cube if placed on this block)]
    const defaultBest: [number, IDim, Vector3D, Cube?] = [Infinity, [-1, -1, -1], Vector3D.zero];

    const newCubePosData = this.visibleCubesFaces.reduce((bestFace, cubeData) => {
      const cube = cubeData.cube;
      cubeData.faceVectors.forEach(directionVector => {
        const faceNormal = directionVector.data as IDim;
        // a vector that is normalized by the cubes dimensions
        const faceVector = arrayMul(CUBE_DIM, faceNormal.map(n => n === 1 ? 1 : 0) as IDim);

        const pointOnFace = arrayAdd(cube.pos.data, faceVector);

        // this d is the d in the equation for a plane: ax + by = cz = d
        const d = arrayDot(faceNormal, pointOnFace);

        // t is the "time" at which the line intersects the plane, it is used to find the point of intersection
        const t = (d - arrayDot(faceNormal, cameraPos)) / arrayDot(faceNormal, cameraDir);

        // This means that the point is behind the camera (don't know why it is negative)
        if (t > 0) {
          return bestFace; // exit
        }

        // now find the point where the line intersections this plane (y = mx + b)
        const mx = arrayScalarMul(cameraDir, t);
        const intersection = arrayAdd(mx, cameraPos);

        // we here make the arbitrary decision that the game will have 5 points of precision when rounding
        const roundedIntersection = intersection.map(num => roundToNPlaces(num, 5)) as IDim;

        if (!firstIntersection) {
          firstIntersection = roundedIntersection;
        }

        // check to see if this intersection is within the face (Doing the whole cube for now, will switch to face later)
        const hit = CubeHelpers.isPointInsideOfCube(cube, new Vector3D(roundedIntersection));

        if (hit) {
          // we have determined that the camera is looking at this face, now see if this is the point
          // closest to the camera

          // get the squared dist so we dont have to do a bunch of sqrt operations
          const pointDist = Math.abs(arrayDistSquared(cameraPos, roundedIntersection));

          if (pointDist < bestFace[0]) {
            const newCubePos = arrayAdd(cube.pos.data, arrayMul(CUBE_DIM, faceNormal)) as IDim;
            bestFace = [pointDist, newCubePos, directionVector, cube];
          }
        }
      });

      return bestFace
    }, defaultBest)

    // this means we didn't find a block
    if (newCubePosData[0] === Infinity || newCubePosData[3] === undefined) {
      return false;
    }

    return {
      newCubePos: new Vector3D(newCubePosData[1]),
      face: getOppositeCubeFace(faceVectorToFaceNumber(newCubePosData[2])),
      cube: newCubePosData[3],
      dist: newCubePosData[0],
    }
  }

}
