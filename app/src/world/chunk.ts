import { Cube } from "../entities/cube";
import { Entity } from "../entities/entity";
import { IDim, IActionType } from "../../types";
import { arrayMul, arrayAdd, arrayDot, arrayScalarMul, roundToNPlaces, arrayDistSquared } from "../utils";
import { Game } from "../game";
import { CONFIG } from "../constants";
import Random from "../utils/random";
import {Biome, PlainsBiome} from "./biome";
import { Vector3D, Vector } from "../utils/vector";
import { BLOCKS } from "../blockdata";


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
  visibleFaces: Array<ICubeFace> = [];
  uid: string;
  biome: Biome;

  constructor(
    public chunkPos: number[],
    private game: Game
  ) {
    this.generate();
    this.uid = `${chunkPos[0]}, ${chunkPos[1]}`;

    this.biome = new PlainsBiome();
  }

  get pos() {
    return [this.chunkPos[0] * CONFIG.chunkSize, 0, this.chunkPos[1] * CONFIG.chunkSize];
  }

  getDistanceFromWorldPoint(point: IDim) {

  }

  circleIntersect(circlePos: Vector3D, radius: number): boolean {
    const testCords = circlePos.copy();
    const chunkPosVector = new Vector(this.pos);

    // find the closest faces to the circle and set the test cords to them
    for (let i = 0; i < 3; i++) {
      if (circlePos.get(i) < chunkPosVector.get(i)) {
        testCords.set(i, chunkPosVector.get(i));
      } else if (circlePos.get(i) > chunkPosVector.get(i) + CONFIG.chunkSize) {
        testCords.set(i, chunkPosVector.get(i) + CONFIG.chunkSize);
      }
    }

    const dist = testCords.distFrom(circlePos);

    return dist <= radius;
  }

  // use seed later down the line
  generate() {
    for (let i = 0; i < CONFIG.chunkSize; i++) {
      for (let j = 0; j < CONFIG.chunkSize; j++) {
        const x = this.pos[0] + i;
        const z = this.pos[2] + j;
        let y: number;
        if (CONFIG.flatWorld) {
          y = 0
        } else {
          y = Math.floor(Random.noise(x, z) * CONFIG.terrain.maxHeight);
        }
        for (let k = 0; k <= y; k++) {
          const cubePos = [x, k, z];
          const cube = new Cube(BLOCKS.grass, cubePos as IDim);
          this.addCube(cube, false);
        }
      }
    }
  }

  // change this to chunks instead of cubes later
  isCollide(ent: Entity): Cube[] {
    const collide: Cube[] = [];
    for (const cube of this.getCubesItterable()) {
      if (cube.isCollide(ent)) {
        collide.push(cube);
      }
    }
    return collide;
  }

  containsCube(cube: Cube) {
    // scale cubes position by chunk size
    const scaledPos = cube.pos.map(dim => Math.floor(dim / CONFIG.chunkSize));

    return scaledPos[0] === this.chunkPos[0] && scaledPos[2] === this.chunkPos[1];

  }

  lookingAt(cameraPos: IDim, cameraDir: IDim): ILookingAtData | false {
    let firstIntersection: IDim;

    // [dist, faceVector( a vector, when added to the cubes pos, gives you the pos of a new cube if placed on this block)]
    const defaultBest: [number, IDim, Cube?] = [Infinity, [-1, -1, -1]];

    const newCubePosData = this.visibleFaces.reduce((bestFace, { cube, directionVector }) => {
      const faceNormal = directionVector.data as IDim;
      // a vector that is normalized by the cubes dimensions
      const faceVector = arrayMul(cube.dim, faceNormal.map(n => n === 1 ? 1 : 0) as IDim);

      const pointOnFace = arrayAdd(cube.pos, faceVector);

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
          const newCubePos = arrayAdd(cube.pos, arrayMul(cube.dim, faceNormal));
          bestFace = [pointDist, newCubePos, cube];
        }
      }

    return bestFace;
    }, defaultBest)

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

  getCubesItterable(): Cube[] {
    return Array.from(this.cubes.values());
  }

  addCube(cube: Cube, update = true) {
    const cubeVectorPos = new Vector(cube.pos);
    this.cubes.set(cubeVectorPos.toString(), cube);
    if (update) {
      this.sendBlockUpdate();
    }
  }

  removeCube(cube: Cube) {
    const cubeVectorPos = new Vector(cube.pos);
    this.cubes.delete(cubeVectorPos.toString());
    this.sendBlockUpdate();
  }

  sendBlockUpdate() {
    this.game.actions.push({
      type: IActionType.blockUpdate,
      blockUpdate: {
        chunkId: this.uid,
      }
    });
  }

}
