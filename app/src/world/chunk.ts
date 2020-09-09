import { Cube } from "../entities/cube";
import { Entity } from "../entities/entity";
import { IDim, IActionType, IAction } from "../../types";
import { arrayMul, arrayAdd, arrayDot, arrayScalarMul, roundToNPlaces, arrayDistSquared } from "../utils";
import { Game } from "../game";
import { CONFIG } from "../constants";
import { Vector3D, Vector, Vector2D } from "../utils/vector";


export interface ICubeFace {
  cube: Cube;
  directionVector: Vector3D;
}

export interface ILookingAtData {
  newCubePos: Vector,
  entity: Entity,
  dist: number;
}

export class Chunk {
  cubes: Map<string, Cube> = new Map();
  // this is set by the client
  visibleCubesFaces: Array<{
    cube: Cube,
    faceVectors: Vector3D[],
  }>


  uid: string;

  constructor(
    public chunkPos: Vector2D,
  ) {
    this.uid = this.chunkPos.toString();
  }

  get pos() {
    return [this.chunkPos.get(0) * CONFIG.terrain.chunkSize, 0, this.chunkPos.get(1) * CONFIG.terrain.chunkSize];
  }

  circleIntersect(circlePos: Vector3D, radius: number): boolean {
    const testCords = circlePos.copy();
    const chunkPosVector = new Vector(this.pos);

    // find the closest faces to the circle and set the test cords to them
    for (let i = 0; i < 3; i++) {
      if (circlePos.get(i) < chunkPosVector.get(i)) {
        testCords.set(i, chunkPosVector.get(i));
      } else if (circlePos.get(i) > chunkPosVector.get(i) + CONFIG.terrain.chunkSize) {
        testCords.set(i, chunkPosVector.get(i) + CONFIG.terrain.chunkSize);
      }
    }

    const dist = testCords.distFrom(circlePos);

    return dist <= radius;
  }

  // pass an entity and I'll push it out of me :)
  pushOut(ent: Entity) {
    const switchDir = (dir: number) => (dir+1) % 2;

    if (!this.visibleCubesFaces) return;

    this.visibleCubesFaces.forEach(({cube, faceVectors}) => {
      let min = [Infinity];
      if (!cube.isCollide(ent)) {
        return;
      }

      faceVectors.forEach(faceVector => {
        const i = faceVector.data.reduce((acc, cur, index) => cur !== 0 ? index: acc, -1);
        const dir = faceVector.get(i) === 1 ? 0 : 1;
        const p = ent.pos.get(i) + ent.dim[i] * dir;
        const c = cube.pos.get(i) + cube.dim[i] * switchDir(dir);
        const dist = Math.abs(c - p);
        // find the shortest distance (that is best one to move)
        if (dist < min[0]) {
          min = [dist, i, dir];
        }
      });
      const [_, i, dir] = min;

      // do the "push-out"
      const moveTo = cube.pos.get(i) + cube.dim[i] * switchDir(dir) - ent.dim[i] * dir;
      // if (i !== 1) {
        // console.log(i, moveTo, cube.pos.toString());
      // }
      ent.pos.set(i, moveTo);

      // alert the entity that they hit something
      ent.hit(cube, {
        side: i,
        dir: dir as 0 | 1,
      })

    });
  }

  containsCube(cube: Cube) {
    // scale cubes position by chunk size
    const scaledPos = cube.pos.data.map(dim => Math.floor(dim / CONFIG.terrain.chunkSize));
    return scaledPos[0] === this.chunkPos.get(0) && scaledPos[2] === this.chunkPos.get(1);
  }

  lookingAt(cameraPos: IDim, cameraDir: IDim): ILookingAtData | false {
    let firstIntersection: IDim;

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

        // we here make the arbutairy decision that the game will have 5 points of persision when rounding
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
    if (newCubePosData[0] === Infinity)  {
      return false;
    }

    return {
      newCubePos: new Vector(newCubePosData[1]),
      entity: newCubePosData[2],
      dist: newCubePosData[0],
    }
  }

  getCube(pos: Vector3D): Cube {
    const cube = this.cubes.get(pos.toString());
    if (!cube) return null;
    return cube;
  }

  getCubesIterable(): Cube[] {
    return Array.from(this.cubes.values());
  }

  addCube(cube: Cube) {
    this.cubes.set(cube.pos.toString(), cube);
  }

  removeCube(cubePos: Vector3D) {
    this.cubes.delete(cubePos.toString());
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
