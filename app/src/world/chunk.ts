import { Cube } from "../entities/cube";
import { Entity } from "../entities/entity";
import { IDim, IActionType, IAction } from "../types";
import { arrayMul, arrayAdd, arrayDot, arrayScalarMul, roundToNPlaces, arrayDistSquared } from "../utils";
import { CONFIG } from "../config";
import { Vector3D, Vector, Vector2D } from "../utils/vector";
import { BLOCK_DATA } from "../blockdata";
import { ISerializedCube, deserializeCube, serializeCube } from "../serializer";
import { Camera } from "../camera";
import { BlockHolder } from "./blockHolder";

export interface ILookingAtData {
  newCubePos: Vector,
  entity?: Entity,
  dist: number;
}

// type SerializedVisibleData = Array<[pos: string, visible: Array<IDim>]>;

export interface ISerializedChunk {
  chunkPos: string,
  cubes: ISerializedCube[],
  // vis: SerializedVisibleData,
}

export class Chunk {
  blocks: BlockHolder;
  // this is set by the client
  visibleCubesFaces: Array<{
    cube: Cube,
    faceVectors: Vector3D[],
  }>


  uid: string;
  pos: Vector3D;

  constructor(
    public chunkPos: Vector2D,
  ) {
    this.uid = this.chunkPos.toIndex();
    this.blocks = new BlockHolder(this);
    this.pos = new Vector3D([
      this.chunkPos.get(0) * CONFIG.terrain.chunkSize,
      0,
      this.chunkPos.get(1) * CONFIG.terrain.chunkSize
    ]);
  }

  serialize() {
    return {
      chunkPos: this.chunkPos.toIndex(),
      cubes: this.blocks.serialize(),
    }
  }

  static deserialize(chunkData: ISerializedChunk) {
    const chunkPos = Vector2D.fromIndex(chunkData.chunkPos);

    const chunk = new Chunk(chunkPos);
    chunk.blocks = BlockHolder.deserialize(chunkData.cubes, chunk);

    return chunk;
  }


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
  pushOut(ent: Entity) {

    const ifCubeExistThenPushOut = (pos: Vector3D) => {
      pos.data = pos.data.map(Math.floor);

      const cube = this.blocks.get(pos);
      if (!cube) return;

      const cubeData = BLOCK_DATA.get(cube.type)!;

      if (!cube.isCollide(ent)) return;
      if (cubeData.intangible) return;

      ent.pushOut(cube);
    }

    // check the edges of the ent to see if it is intersecting the cubes
    for (let x = 0; x < ent.dim[0]; x++) {
      const centerX = x + .5;
      for (let y = 0; y < ent.dim[1]; y++) {
        const centerY = y + .5;
        for (let z = 0; z < ent.dim[2]; z++) {
          const centerZ = z + .5;
          const center = ent.pos.add(new Vector3D([centerX, centerY, centerZ]));

          // check the unit vectors first
          for (const vec of Vector3D.unitVectors) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }

          for (const vec of Vector3D.edgeVectors) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }

          for (const vec of Vector3D.cornerVectors) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }
        }
      }
    }
  }

  containsWorldPos(worldPos: Vector3D) {
    // scale cubes position by chunk size
    const scaledPos = worldPos.data.map(dim => Math.floor(dim / CONFIG.terrain.chunkSize));
    return scaledPos[0] === this.chunkPos.get(0) && scaledPos[2] === this.chunkPos.get(1);
  }

  lookingAt(camera: Camera): ILookingAtData | false {
    let firstIntersection: IDim;

    const cameraPos = camera.pos.data;
    const cameraDir = camera.rotCart.multiply(new Vector3D([1, -1, 1])).data;

    // [dist, faceVector( a vector, when added to the cubes pos, gives you the pos of a new cube if placed on this block)]
    const defaultBest: [number, IDim, Cube?] = [Infinity, [-1, -1, -1]];

    const newCubePosData = this.visibleCubesFaces.reduce((bestFace, cubeData) => {
      const cube = cubeData.cube;
      cubeData.faceVectors.forEach(directionVector => {
        const faceNormal = directionVector.data as IDim;
        // a vector that is normalized by the cubes dimensions
        const faceVector = arrayMul(cube.dim, faceNormal.map(n => n === 1 ? 1 : 0) as IDim);

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
        const hit = cube.isPointInsideMe(roundedIntersection);

        if (hit) {
          // we have determined that the camera is looking at this face, now see if this is the point
          // closest to the camera

          // get the squared dist so we dont have to do a bunch of sqrt operations
          const pointDist = Math.abs(arrayDistSquared(cameraPos, roundedIntersection));

          if (pointDist < bestFace[0]) {
            const newCubePos = arrayAdd(cube.pos.data, arrayMul(cube.dim, faceNormal)) as IDim;
            bestFace = [pointDist, newCubePos, cube];
          }
        }
      });


      return bestFace
    }, defaultBest)

    // const newCubePosData = this.visibleFaces.reduce((bestFace, { cube, directionVector }) => {

    // return bestFace;
    // }, defaultBest)

    // this means we didn't find a block
    if (newCubePosData[0] === Infinity) {
      return false;
    }

    return {
      newCubePos: new Vector(newCubePosData[1]),
      entity: newCubePosData[2],
      dist: newCubePosData[0],
    }
  }

  getBlockUpdateAction(): IAction {
    return {
      type: IActionType.blockUpdate,
      blockUpdate: {
        chunkId: this.uid,
      }
    }
  }

}
